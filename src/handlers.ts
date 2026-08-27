import { randomUUID, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  buildSsoLogoutUrl,
  buildSsoStartUrl,
  exchangeSsoAuthorization,
} from "./client.js";
import {
  getAppBaseUrl,
  getSsoReturnToCookieName,
  getSsoStateCookieName,
  isDevMockLoginEnabled,
} from "./config.js";
import {
  clearSsoAccessTokenCookie,
  clearSsoRequestCookies,
  clearSsoSessionCookie,
  setSsoRequestCookies,
  setSsoAccessTokenCookie,
  setSsoSessionCookie,
} from "./cookies.js";
import { normalizeReturnTo } from "./return-to.js";
import {
  createSsoAccessTokenCookieValue,
  createSsoSessionToken,
} from "./session.js";

function statesMatch(incoming: string, stored: string) {
  const incomingBuffer = Buffer.from(incoming);
  const storedBuffer = Buffer.from(stored);
  return (
    incomingBuffer.length === storedBuffer.length &&
    timingSafeEqual(incomingBuffer, storedBuffer)
  );
}

export async function handleSsoLogin(request: NextRequest) {
  const returnTo = normalizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );

  if (isDevMockLoginEnabled()) {
    const response = NextResponse.redirect(
      new URL(returnTo, `${getAppBaseUrl()}/`),
    );
    clearSsoAccessTokenCookie(request, response);
    clearSsoRequestCookies(request, response);
    return response;
  }

  const state = randomUUID();
  const response = NextResponse.redirect(buildSsoStartUrl(state));
  setSsoRequestCookies(request, response, state, returnTo);
  return response;
}

export async function handleSsoCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  const storedState = request.cookies.get(getSsoStateCookieName())?.value ?? "";
  const returnTo = normalizeReturnTo(
    request.cookies.get(getSsoReturnToCookieName())?.value,
  );

  if (!code || !state || !storedState || !statesMatch(state, storedState)) {
    const errorUrl = new URL("/login", `${getAppBaseUrl()}/`);
    errorUrl.searchParams.set("error", "sso_state");
    errorUrl.searchParams.set("returnTo", returnTo);
    const response = NextResponse.redirect(errorUrl);
    clearSsoRequestCookies(request, response);
    return response;
  }

  try {
    const authorization = await exchangeSsoAuthorization(code);
    const response = NextResponse.redirect(
      new URL(returnTo, `${getAppBaseUrl()}/`),
    );
    setSsoSessionCookie(
      request,
      response,
      createSsoSessionToken(authorization.user),
    );
    setSsoAccessTokenCookie(
      request,
      response,
      createSsoAccessTokenCookieValue(
        authorization.accessToken,
        authorization.expiresIn,
      ),
      authorization.expiresIn,
    );
    clearSsoRequestCookies(request, response);
    return response;
  } catch {
    const errorUrl = new URL("/login", `${getAppBaseUrl()}/`);
    errorUrl.searchParams.set("error", "sso_exchange");
    errorUrl.searchParams.set("returnTo", returnTo);
    const response = NextResponse.redirect(errorUrl);
    clearSsoAccessTokenCookie(request, response);
    clearSsoRequestCookies(request, response);
    return response;
  }
}

export async function handleSsoLogout(request: NextRequest) {
  const returnTo = normalizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );

  if (isDevMockLoginEnabled()) {
    const response = NextResponse.redirect(
      new URL(returnTo, `${getAppBaseUrl()}/`),
    );
    clearSsoSessionCookie(request, response);
    clearSsoAccessTokenCookie(request, response);
    clearSsoRequestCookies(request, response);
    return response;
  }

  const response = NextResponse.redirect(buildSsoLogoutUrl(returnTo));
  clearSsoSessionCookie(request, response);
  clearSsoAccessTokenCookie(request, response);
  clearSsoRequestCookies(request, response);
  return response;
}
