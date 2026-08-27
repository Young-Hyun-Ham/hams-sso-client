import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSsoSessionCookieName, isDevMockLoginEnabled } from "./config.js";
import { getSsoUserFromRequest } from "./session.js";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/sso/login",
  "/api/sso/callback",
  "/api/auth/logout",
]);

export function createSsoProxy() {
  return function ssoProxy(request: NextRequest) {
    if (isDevMockLoginEnabled()) {
      return NextResponse.next();
    }

    const pathname = request.nextUrl.pathname;

    if (PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    const user = getSsoUserFromRequest(request);

    if (user) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { ok: false, error: "authentication_required" },
        { status: 401 },
      );

      const sessionCookieName = getSsoSessionCookieName();
      if (request.cookies.has(sessionCookieName)) {
        response.cookies.delete(sessionCookieName);
      }

      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);

    const sessionCookieName = getSsoSessionCookieName();
    if (request.cookies.has(sessionCookieName)) {
      response.cookies.delete(sessionCookieName);
    }

    return response;
  };
}
