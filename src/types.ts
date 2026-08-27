export type SsoGender = "male" | "female" | "other" | "prefer_not_to_say";
export type SsoServicePlan = "basic" | "standard" | "premium";

export type SsoServiceMembership = {
  serviceSiteId: string;
  clientId: string;
  serviceName: string;
  plan: SsoServicePlan;
  monthlyPrice: number;
  joinedAt: string;
};

export type SsoSessionUser = {
  id: string;
  email: string;
  loginId: string;
  nickname: string;
  provider: string;
  providerSubject: string | null;
  phoneNumber: string | null;
  termsVersion: string | null;
  birthDate: string | null;
  gender: SsoGender | null;
  serviceMemberships: SsoServiceMembership[];

  aiEnabled: boolean;
  aiChatType: "gpt" | "gemini" | "claude" | null;
  chatModel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SsoExchangeUser = {
  id: string;
  loginId?: string;
  email: string;
  nickname?: string;
  phoneNumber?: string;
  provider?: string;
  providerSubject?: string;
  termsVersion?: string | null;
  birthDate?: string | null;
  gender?: SsoGender | null;
  serviceMemberships?: SsoServiceMembership[];

  aiEnabled?: boolean;
  aiChatType?: "gpt" | "gemini" | "claude" | null;
  chatModel?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SsoAuthorizationResult = {
  user: SsoSessionUser;
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type SsoAccessTokenPayload = {
  version: 1;
  accessToken: string;
  expiresAt: number;
};

export type SsoSessionPayload = {
  version: 1;
  user: SsoSessionUser;
  issuedAt: number;
  expiresAt: number;
};
