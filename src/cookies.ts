import type { NextRequest, NextResponse } from "next/server";

import {
  getSessionMaxAgeSeconds,
  getSsoAccessTokenCookieName,
  getSsoReturnToCookieName,
  getSsoSessionCookieName,
  getSsoStateCookieName,
} from "./config.js";
import { SSO_TEMP_COOKIE_MAX_AGE_SECONDS } from "./session.js";

function isSecureRequest(request: NextRequest) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  return forwardedProtocol
    ? forwardedProtocol === "https"
    : request.nextUrl.protocol === "https:";
}

function cookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setSsoRequestCookies(
  request: NextRequest,
  response: NextResponse,
  state: string,
  returnTo: string,
) {
  const options = cookieOptions(request, SSO_TEMP_COOKIE_MAX_AGE_SECONDS);
  response.cookies.set(getSsoStateCookieName(), state, options);
  response.cookies.set(getSsoReturnToCookieName(), returnTo, options);
}

export function clearSsoRequestCookies(
  request: NextRequest,
  response: NextResponse,
) {
  const options = cookieOptions(request, 0);
  response.cookies.set(getSsoStateCookieName(), "", options);
  response.cookies.set(getSsoReturnToCookieName(), "", options);
}

export function setSsoSessionCookie(
  request: NextRequest,
  response: NextResponse,
  token: string,
) {
  response.cookies.set(
    getSsoSessionCookieName(),
    token,
    cookieOptions(request, getSessionMaxAgeSeconds()),
  );
}

export function setSsoAccessTokenCookie(
  request: NextRequest,
  response: NextResponse,
  value: string,
  expiresIn: number,
) {
  response.cookies.set(
    getSsoAccessTokenCookieName(),
    value,
    cookieOptions(request, Math.min(expiresIn, getSessionMaxAgeSeconds())),
  );
}

export function clearSsoSessionCookie(
  request: NextRequest,
  response: NextResponse,
) {
  response.cookies.set(getSsoSessionCookieName(), "", cookieOptions(request, 0));
}

export function clearSsoAccessTokenCookie(
  request: NextRequest,
  response: NextResponse,
) {
  response.cookies.set(
    getSsoAccessTokenCookieName(),
    "",
    cookieOptions(request, 0),
  );
}
