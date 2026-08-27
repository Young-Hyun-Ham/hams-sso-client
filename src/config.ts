import type { SsoSessionUser } from "./types.js";

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function normalizeBaseUrl(value: string) {
  const parsed = new URL(value);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function getSsoServerUrl() {
  return normalizeBaseUrl(requiredEnvironment("HAMS_OAUTH_SERVER_URL"));
}

export function getSsoClientId() {
  return requiredEnvironment("HAMS_OAUTH_CLIENT_ID");
}

export function getSsoClientSecret() {
  return requiredEnvironment("HAMS_OAUTH_CLIENT_SECRET");
}

export function getAppBaseUrl() {
  return normalizeBaseUrl(requiredEnvironment("NEXT_PUBLIC_APP_URL"));
}

export function getSsoCallbackUrl() {
  return `${getAppBaseUrl()}/api/sso/callback`;
}

export function getSessionSecret() {
  return requiredEnvironment("HAMS_SESSION_SECRET");
}

function normalizeCookiePrefix(value: string) {
  const prefix = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!prefix) {
    throw new Error("HAMS_COOKIE_PREFIX is invalid.");
  }

  return prefix;
}

export function getCookiePrefix() {
  return normalizeCookiePrefix(
    process.env.HAMS_COOKIE_PREFIX?.trim() || getSsoClientId(),
  );
}

export function getSsoSessionCookieName() {
  return `${getCookiePrefix()}_session`;
}

export function getSsoAccessTokenCookieName() {
  return `${getCookiePrefix()}_sso_access_token`;
}

export function getSsoStateCookieName() {
  return `${getCookiePrefix()}_sso_state`;
}

export function getSsoReturnToCookieName() {
  return `${getCookiePrefix()}_sso_return_to`;
}

export function getSessionMaxAgeSeconds() {
  const configured = Number(process.env.HAMS_SSO_SESSION_MAX_AGE_SEC);

  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : DEFAULT_SESSION_MAX_AGE_SECONDS;
}

export function isDevMockLoginEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_MOCK_LOGIN === "true"
  );
}

export function getDevMockUser(): SsoSessionUser {
  return {
    id: process.env.HAMS_SSO_DEV_MOCK_USER_ID?.trim() || "dev-user",
    email:
      process.env.HAMS_SSO_DEV_MOCK_USER_EMAIL?.trim() || "dev@localhost",
    loginId: process.env.HAMS_SSO_DEV_MOCK_USER_LOGIN_ID?.trim() || "dev",
    nickname:
      process.env.HAMS_SSO_DEV_MOCK_USER_NAME?.trim() || "개발자",
    provider: "dev-mock",
    providerSubject: null,
    phoneNumber: null,
    termsVersion: null,
    birthDate: null,
    gender: null,
    serviceMemberships: [],

    aiEnabled: false,
    aiChatType: "gpt",
    chatModel: "",
    createdAt: "",
    updatedAt: "",
  };
}
