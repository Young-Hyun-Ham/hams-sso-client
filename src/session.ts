import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  getDevMockUser,
  getSsoAccessTokenCookieName,
  getSsoSessionCookieName,
  getSessionMaxAgeSeconds,
  getSessionSecret,
  isDevMockLoginEnabled,
} from "./config.js";
import type {
  SsoAccessTokenPayload,
  SsoSessionPayload,
  SsoSessionUser,
} from "./types.js";

export const SSO_TEMP_COOKIE_MAX_AGE_SECONDS = 60 * 10;

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function encryptionKey() {
  return createHash("sha256").update(getSessionSecret()).digest();
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createSsoSessionToken(user: SsoSessionUser) {
  const issuedAt = Date.now();
  const payload: SsoSessionPayload = {
    version: 1,
    user,
    issuedAt,
    expiresAt: issuedAt + getSessionMaxAgeSeconds() * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${body}.${sign(body)}`;
}

export function createSsoAccessTokenCookieValue(
  accessToken: string,
  expiresIn: number,
) {
  const payload: SsoAccessTokenPayload = {
    version: 1,
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function verifySsoAccessTokenCookieValue(
  value: string | null | undefined,
) {
  if (!value) return null;

  const [version, ivPart, encryptedPart, tagPart] = value.split(".");
  if (version !== "v1" || !ivPart || !encryptedPart || !tagPart) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const payload = JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    ) as SsoAccessTokenPayload;

    if (
      payload.version !== 1 ||
      !payload.accessToken ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function verifySsoSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature || !safeEqual(signature, sign(body))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SsoSessionPayload;

    if (
      payload.version !== 1 ||
      !payload.user?.id ||
      !payload.user.email ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function readCookieHeader(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const cookieName = cookie.slice(0, separator).trim();

    if (cookieName === name) {
      return cookie.slice(separator + 1).trim();
    }
  }

  return null;
}

export function getSsoSessionFromRequest(request: Request) {
  return verifySsoSessionToken(
    readCookieHeader(request, getSsoSessionCookieName()),
  );
}

export function getSsoAccessTokenFromRequest(request: Request) {
  if (isDevMockLoginEnabled()) return null;
  return (
    verifySsoAccessTokenCookieValue(
      readCookieHeader(request, getSsoAccessTokenCookieName()),
    )?.accessToken ?? null
  );
}

export function getSsoUserFromRequest(request: Request) {
  if (isDevMockLoginEnabled()) {
    return getDevMockUser();
  }

  return getSsoSessionFromRequest(request)?.user ?? null;
}

export function unauthorizedSsoResponse() {
  return Response.json(
    { ok: false, error: "authentication_required" },
    { status: 401 },
  );
}
