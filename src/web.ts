import { randomUUID, timingSafeEqual } from "node:crypto";

import {
  buildSsoLogoutUrl,
  buildSsoStartUrl,
  exchangeSsoAuthorization,
} from "./client.js";
import {
  getAppBaseUrl,
  getSessionMaxAgeSeconds,
  getSsoAccessTokenCookieName,
  getSsoReturnToCookieName,
  getSsoSessionCookieName,
  getSsoStateCookieName,
  isDevMockLoginEnabled,
} from "./config.js";
import { normalizeReturnTo } from "./return-to.js";
import {
  createSsoAccessTokenCookieValue,
  createSsoSessionToken,
  getSsoUserFromRequest,
  SSO_TEMP_COOKIE_MAX_AGE_SECONDS,
} from "./session.js";

function statesMatch(incoming: string, stored: string) {
  const incomingBuffer = Buffer.from(incoming);
  const storedBuffer = Buffer.from(stored);
  return (
    incomingBuffer.length === storedBuffer.length &&
    timingSafeEqual(incomingBuffer, storedBuffer)
  );
}

function readCookies(request: Request) {
  const result = new Map<string, string>();
  for (const cookie of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    const name = cookie.slice(0, separator).trim();
    const value = cookie.slice(separator + 1).trim();
    if (!name) continue;
    try {
      result.set(name, decodeURIComponent(value));
    } catch {
      result.set(name, value);
    }
  }
  return result;
}

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  return forwardedProtocol
    ? forwardedProtocol === "https"
    : new URL(request.url).protocol === "https:";
}

function serializeCookie(
  request: Request,
  name: string,
  value: string,
  maxAge: number,
) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    ...(isSecureRequest(request) ? ["Secure"] : []),
  ].join("; ");
}

function redirect(location: URL | string, cookies: string[] = []) {
  const headers = new Headers({ Location: location.toString() });
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return new Response(null, { status: 302, headers });
}

function json(
  body: Record<string, unknown>,
  status = 200,
  cookies: string[] = [],
) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return new Response(JSON.stringify(body), { status, headers });
}

function clearRequestCookies(request: Request) {
  return [
    serializeCookie(request, getSsoStateCookieName(), "", 0),
    serializeCookie(request, getSsoReturnToCookieName(), "", 0),
  ];
}

function clearAuthCookies(request: Request) {
  return [
    serializeCookie(request, getSsoSessionCookieName(), "", 0),
    serializeCookie(request, getSsoAccessTokenCookieName(), "", 0),
  ];
}

export async function handleSsoLogin(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = normalizeReturnTo(requestUrl.searchParams.get("returnTo"));

  if (isDevMockLoginEnabled()) {
    return redirect(new URL(returnTo, `${getAppBaseUrl()}/`), [
      serializeCookie(request, getSsoAccessTokenCookieName(), "", 0),
      ...clearRequestCookies(request),
    ]);
  }

  const state = randomUUID();
  return redirect(buildSsoStartUrl(state), [
    serializeCookie(
      request,
      getSsoStateCookieName(),
      state,
      SSO_TEMP_COOKIE_MAX_AGE_SECONDS,
    ),
    serializeCookie(
      request,
      getSsoReturnToCookieName(),
      returnTo,
      SSO_TEMP_COOKIE_MAX_AGE_SECONDS,
    ),
  ]);
}

export async function handleSsoCallback(request: Request) {
  const requestUrl = new URL(request.url);
  const cookies = readCookies(request);
  const code = requestUrl.searchParams.get("code")?.trim() ?? "";
  const state = requestUrl.searchParams.get("state")?.trim() ?? "";
  const storedState = cookies.get(getSsoStateCookieName()) ?? "";
  const returnTo = normalizeReturnTo(cookies.get(getSsoReturnToCookieName()));

  if (!code || !state || !storedState || !statesMatch(state, storedState)) {
    const errorUrl = new URL("/login", `${getAppBaseUrl()}/`);
    errorUrl.searchParams.set("error", "sso_state");
    errorUrl.searchParams.set("returnTo", returnTo);
    return redirect(errorUrl, clearRequestCookies(request));
  }

  try {
    const authorization = await exchangeSsoAuthorization(code);
    return redirect(new URL(returnTo, `${getAppBaseUrl()}/`), [
      serializeCookie(
        request,
        getSsoSessionCookieName(),
        createSsoSessionToken(authorization.user),
        getSessionMaxAgeSeconds(),
      ),
      serializeCookie(
        request,
        getSsoAccessTokenCookieName(),
        createSsoAccessTokenCookieValue(
          authorization.accessToken,
          authorization.expiresIn,
        ),
        Math.min(authorization.expiresIn, getSessionMaxAgeSeconds()),
      ),
      ...clearRequestCookies(request),
    ]);
  } catch {
    const errorUrl = new URL("/login", `${getAppBaseUrl()}/`);
    errorUrl.searchParams.set("error", "sso_exchange");
    errorUrl.searchParams.set("returnTo", returnTo);
    return redirect(errorUrl, [
      serializeCookie(request, getSsoAccessTokenCookieName(), "", 0),
      ...clearRequestCookies(request),
    ]);
  }
}

export async function handleSsoLogout(request: Request) {
  const returnTo = normalizeReturnTo(
    new URL(request.url).searchParams.get("returnTo"),
  );
  const cookies = [
    ...clearAuthCookies(request),
    ...clearRequestCookies(request),
  ];

  return isDevMockLoginEnabled()
    ? redirect(new URL(returnTo, `${getAppBaseUrl()}/`), cookies)
    : redirect(buildSsoLogoutUrl(returnTo), cookies);
}

export async function handleAuthMe(request: Request) {
  const user = getSsoUserFromRequest(request);
  return user
    ? json({ user })
    : json({ ok: false, error: "authentication_required" }, 401);
}
