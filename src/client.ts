import { createCipheriv, createHash, randomBytes } from "node:crypto";

import {
  getAppBaseUrl,
  getSsoCallbackUrl,
  getSsoClientId,
  getSsoClientSecret,
  getSsoServerUrl,
} from "./config.js";
import { normalizeReturnTo } from "./return-to.js";
import type {
  SsoAuthorizationResult,
  SsoExchangeUser,
  SsoSessionUser,
} from "./types.js";

export function buildSsoStartUrl(state: string) {
  const url = new URL("/sso/start", getSsoServerUrl());
  url.searchParams.set("client_id", getSsoClientId());
  url.searchParams.set("redirect_uri", getSsoCallbackUrl());
  url.searchParams.set("state", state);
  return url;
}

function toSessionUser(user: SsoExchangeUser): SsoSessionUser {
  const currentServiceMembership = Array.isArray(user.serviceMemberships)
    ? user.serviceMemberships.find(
        (membership) => membership.clientId === getSsoClientId(),
      )
    : undefined;

  return {
    id: user.id,
    email: user.email,
    loginId: user.loginId ?? "",
    nickname: user.nickname ?? user.loginId ?? user.email,
    provider: user.provider ?? "sso",
    providerSubject: user.providerSubject ?? null,
    phoneNumber: user.phoneNumber ?? null,
    termsVersion: user.termsVersion ?? null,
    birthDate: user.birthDate ?? null,
    gender: user.gender ?? null,
    serviceMemberships: currentServiceMembership
      ? [currentServiceMembership]
      : [],

    aiEnabled: user.aiEnabled ?? false,
    aiChatType: user.aiChatType ?? null,
    chatModel: user.chatModel ?? null,
    createdAt: user.createdAt ?? "",
    updatedAt: user.updatedAt ?? "",
  };
}

export async function exchangeSsoAuthorization(code: string) {
  const response = await fetch(
    new URL("/api/sso/exchange", getSsoServerUrl()),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        client_id: getSsoClientId(),
        client_secret: getSsoClientSecret(),
        code,
        redirect_uri: getSsoCallbackUrl(),
      }),
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    user?: SsoExchangeUser;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  } | null;

  if (
    !response.ok ||
    !payload?.ok ||
    !payload.user?.id ||
    !payload.user.email ||
    !payload.access_token ||
    payload.token_type !== "Bearer" ||
    typeof payload.expires_in !== "number" ||
    !Number.isSafeInteger(payload.expires_in) ||
    payload.expires_in <= 0
  ) {
    throw new Error(payload?.error ?? "sso_exchange_failed");
  }

  return {
    user: toSessionUser(payload.user),
    accessToken: payload.access_token,
    tokenType: "Bearer",
    expiresIn: payload.expires_in,
  } satisfies SsoAuthorizationResult;
}

export async function exchangeSsoAuthorizationCode(code: string) {
  return (await exchangeSsoAuthorization(code)).user;
}

function encryptLogoutToken(payload: object) {
  const key = createHash("sha256").update(getSsoClientSecret()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function buildServiceLoginUrl(returnTo?: string | null) {
  const url = new URL("/api/sso/login", getAppBaseUrl());
  url.searchParams.set("returnTo", normalizeReturnTo(returnTo));
  return url.toString();
}

export function buildSsoLogoutUrl(returnTo?: string | null) {
  const normalizedReturnTo = normalizeReturnTo(returnTo);
  const now = Date.now();
  const payload = {
    logout: true,
    service: getSsoClientId(),
    returnTo: new URL(normalizedReturnTo, `${getAppBaseUrl()}/`).toString(),
    loginStartUrl: buildServiceLoginUrl(normalizedReturnTo),
    issuedAt: now,
    expiresAt: now + 10 * 60 * 1000,
  };
  const url = new URL("/sso/logout", getSsoServerUrl());
  url.searchParams.set("sso_logout_token", encryptLogoutToken(payload));
  return url;
}
