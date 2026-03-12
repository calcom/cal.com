import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import {
  AuthExpiredError,
  CalendarProvider,
  ProviderPermanentError,
  ProviderTransientError,
  type CredentialLike,
} from "./types";

interface BaseAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | null;
}

export interface GoogleAuthTokens extends BaseAuthTokens {
  idToken: string | null;
  tokenType: string | null;
  scope: string | null;
}

export interface OutlookAuthTokens extends BaseAuthTokens {
  tokenType: string | null;
  scope: string | null;
}

type UnknownRecord = Record<string, unknown>;
type TokenContainerPath = [] | [string];
type RefreshTokenResponse = Record<string, unknown>;

const log = logger.getSubLogger({ prefix: ["[job-engine/calendar/provider-auth]"] });
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60_000;
const GOOGLE_APP_SLUG = "google-calendar";
const OFFICE365_APP_SLUG = "office365-calendar";

const asRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
};

const getString = (obj: UnknownRecord, key: string): string | null => {
  const value = obj[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getNumber = (obj: UnknownRecord, key: string): number | null => {
  const value = obj[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getNumberish = (obj: UnknownRecord, key: string): number | null => {
  const numberValue = getNumber(obj, key);
  if (numberValue !== null) {
    return numberValue;
  }
  const stringValue = getString(obj, key);
  if (!stringValue) {
    return null;
  }
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseExpiryDate = (tokenData: UnknownRecord): number | null => {
  const googleEpochMs = getNumberish(tokenData, "expiry_date");
  if (googleEpochMs !== null) {
    return googleEpochMs;
  }

  const directEpoch = getNumber(tokenData, "expiryDate");
  if (directEpoch !== null) {
    return directEpoch;
  }

  const expiresAt = getNumber(tokenData, "expires_at");
  if (expiresAt !== null) {
    return expiresAt;
  }

  const expiresAtString = getString(tokenData, "expires_at");
  if (expiresAtString) {
    const parsed = Number(expiresAtString);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeExpiryToEpochMs = (expiryDate: number | null): number | null => {
  if (expiryDate === null || !Number.isFinite(expiryDate)) {
    return null;
  }

  // If value appears to be epoch-seconds, convert to ms.
  if (expiryDate > 0 && expiryDate < 10_000_000_000) {
    return expiryDate * 1000;
  }

  return expiryDate;
};

const isAccessTokenExpired = (expiryDate: number | null): boolean => {
  const epochMs = normalizeExpiryToEpochMs(expiryDate);
  if (epochMs === null) {
    return false;
  }
  return epochMs - ACCESS_TOKEN_REFRESH_THRESHOLD_MS <= Date.now();
};

const findTokenContainerWithPath = (
  key: unknown
): { root: UnknownRecord; container: UnknownRecord | null; path: TokenContainerPath } | null => {
  const root = asRecord(key);
  if (!root) {
    return null;
  }

  const nestedCandidates: Array<{ path: TokenContainerPath; value: UnknownRecord | null }> = [
    { path: [], value: root },
    { path: ["credentials"], value: asRecord(root.credentials) },
    { path: ["oauth"], value: asRecord(root.oauth) },
    { path: ["oauth2"], value: asRecord(root.oauth2) },
    { path: ["token"], value: asRecord(root.token) },
    { path: ["tokens"], value: asRecord(root.tokens) },
  ];

  for (const candidate of nestedCandidates) {
    if (!candidate.value) {
      continue;
    }
    if (getString(candidate.value, "access_token") || getString(candidate.value, "accessToken")) {
      return { root, container: candidate.value, path: candidate.path };
    }
  }

  return { root, container: root, path: [] };
};

const assertAccessToken = (
  provider: CalendarProvider,
  credential: CredentialLike,
  tokenContainer: UnknownRecord | null
): string => {
  if (!tokenContainer) {
    throw new ProviderPermanentError({
      provider,
      message: `Credential ${credential.id} has invalid key payload.`,
    });
  }

  const accessToken = getString(tokenContainer, "access_token") ?? getString(tokenContainer, "accessToken");
  if (!accessToken) {
    throw new AuthExpiredError({
      provider,
      message: `Credential ${credential.id} is missing access token.`,
    });
  }

  return accessToken;
};

export const getGoogleAuth = (credential: CredentialLike): GoogleAuthTokens => {
  const tokenContainer = findTokenContainerWithPath(credential.key)?.container ?? null;
  const accessToken = assertAccessToken(CalendarProvider.GOOGLE, credential, tokenContainer);

  return {
    accessToken,
    refreshToken:
      getString(tokenContainer as UnknownRecord, "refresh_token") ??
      getString(tokenContainer as UnknownRecord, "refreshToken"),
    expiryDate: parseExpiryDate(tokenContainer as UnknownRecord),
    idToken:
      getString(tokenContainer as UnknownRecord, "id_token") ??
      getString(tokenContainer as UnknownRecord, "idToken"),
    tokenType:
      getString(tokenContainer as UnknownRecord, "token_type") ??
      getString(tokenContainer as UnknownRecord, "tokenType"),
    scope: getString(tokenContainer as UnknownRecord, "scope"),
  };
};

export const getOutlookAuth = (credential: CredentialLike): OutlookAuthTokens => {
  const tokenContainer = findTokenContainerWithPath(credential.key)?.container ?? null;
  const accessToken = assertAccessToken(CalendarProvider.OUTLOOK, credential, tokenContainer);

  return {
    accessToken,
    refreshToken:
      getString(tokenContainer as UnknownRecord, "refresh_token") ??
      getString(tokenContainer as UnknownRecord, "refreshToken"),
    expiryDate: parseExpiryDate(tokenContainer as UnknownRecord),
    tokenType:
      getString(tokenContainer as UnknownRecord, "token_type") ??
      getString(tokenContainer as UnknownRecord, "tokenType"),
    scope: getString(tokenContainer as UnknownRecord, "scope"),
  };
};

const getAppKeys = async (
  provider: CalendarProvider
): Promise<{ clientId: string; clientSecret: string }> => {
  const slug = provider === CalendarProvider.GOOGLE ? GOOGLE_APP_SLUG : OFFICE365_APP_SLUG;
  const app = await prisma.app.findUnique({
    where: { slug },
    select: { keys: true },
  });
  const keys = asRecord(app?.keys);

  const clientId = keys ? getString(keys, "client_id") : null;
  const clientSecret = keys ? getString(keys, "client_secret") : null;

  if (!clientId || !clientSecret) {
    throw new ProviderPermanentError({
      provider,
      message: `OAuth app keys are missing for ${slug}.`,
    });
  }

  return { clientId, clientSecret };
};

const parseRefreshResponseJson = async (response: Response): Promise<RefreshTokenResponse> => {
  try {
    const body = (await response.json()) as unknown;
    return asRecord(body) ?? {};
  } catch {
    return {};
  }
};

const toEpochMsFromExpiresInSeconds = (value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  return Date.now() + value * 1000;
};

const buildUpdatedTokenContainer = (params: {
  tokenContainer: UnknownRecord;
  refreshResponse: RefreshTokenResponse;
  currentRefreshToken: string | null;
}): UnknownRecord => {
  const { tokenContainer, refreshResponse, currentRefreshToken } = params;
  const nextAccessToken =
    getString(refreshResponse, "access_token") ?? getString(refreshResponse, "accessToken");
  if (!nextAccessToken) {
    return tokenContainer;
  }

  const nextRefreshToken =
    getString(refreshResponse, "refresh_token") ??
    getString(refreshResponse, "refreshToken") ??
    currentRefreshToken;
  const expiresInSeconds = getNumberish(refreshResponse, "expires_in");
  const refreshExpiryDate =
    getNumberish(refreshResponse, "expiry_date") ??
    getNumberish(refreshResponse, "expiryDate") ??
    getNumberish(refreshResponse, "expires_at") ??
    toEpochMsFromExpiresInSeconds(expiresInSeconds);
  const nextIdToken = getString(refreshResponse, "id_token");
  const nextTokenType = getString(refreshResponse, "token_type");
  const nextScope = getString(refreshResponse, "scope");

  return {
    ...tokenContainer,
    access_token: nextAccessToken,
    refresh_token: nextRefreshToken ?? undefined,
    expiryDate: refreshExpiryDate ?? undefined,
    expiry_date: refreshExpiryDate ?? undefined,
    id_token: nextIdToken ?? tokenContainer.id_token,
    token_type: nextTokenType ?? tokenContainer.token_type,
    scope: nextScope ?? tokenContainer.scope,
  };
};

const writeUpdatedTokenContainer = (params: {
  root: UnknownRecord;
  path: TokenContainerPath;
  updatedTokenContainer: UnknownRecord;
}): UnknownRecord => {
  if (params.path.length === 0) {
    return params.updatedTokenContainer;
  }

  const [key] = params.path;
  return {
    ...params.root,
    [key]: params.updatedTokenContainer,
  };
};

const persistCredentialKey = async (credentialId: number, key: unknown): Promise<void> => {
  await prisma.credential.update({
    where: { id: credentialId },
    data: {
      key: key as Prisma.InputJsonValue,
    },
  });
};

const getProviderAuth = (
  provider: CalendarProvider
): ((credential: CredentialLike) => GoogleAuthTokens | OutlookAuthTokens) => {
  switch (provider) {
    case CalendarProvider.GOOGLE:
      return getGoogleAuth;
    case CalendarProvider.OUTLOOK:
      return getOutlookAuth;
    default:
      throw new Error("Couldn't get provider auth");
  }
};

const refreshAccessTokenIfExpired = async (params: {
  provider: CalendarProvider;
  credential: CredentialLike;
}): Promise<void> => {
  const tokenLocation = findTokenContainerWithPath(params.credential.key);
  const tokenContainer = tokenLocation?.container;
  if (!tokenLocation || !tokenContainer) {
    throw new ProviderPermanentError({
      provider: params.provider,
      message: `Credential ${params.credential.id} has invalid key payload.`,
    });
  }

  const authFn = getProviderAuth(params.provider);
  const currentAuth = authFn(params.credential);

  if (!isAccessTokenExpired(currentAuth.expiryDate)) {
    return;
  }

  if (!currentAuth.refreshToken) {
    throw new AuthExpiredError({
      provider: params.provider,
      message: `Credential ${params.credential.id} access token expired and refresh token is missing.`,
    });
  }

  const { clientId, clientSecret } = await getAppKeys(params.provider);
  const refreshUrl =
    params.provider === CalendarProvider.GOOGLE
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const refreshBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: currentAuth.refreshToken,
    ...(params.provider === CalendarProvider.OUTLOOK
      ? { scope: "User.Read Calendars.Read Calendars.ReadWrite" }
      : {}),
  });

  const refreshResponse = await fetch(refreshUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: refreshBody,
  });
  const refreshResponseBody = await parseRefreshResponseJson(refreshResponse);

  if (!refreshResponse.ok) {
    const reason = getString(refreshResponseBody, "error");
    const description = getString(refreshResponseBody, "error_description");
    const message = `${reason ?? "token_refresh_failed"}${description ? `: ${description}` : ""}`;
    log.warn("Calendar provider access token refresh failed", {
      provider: params.provider,
      credentialId: params.credential.id,
      status: refreshResponse.status,
      reason: reason ?? null,
    });

    if (
      refreshResponse.status === 400 ||
      refreshResponse.status === 401 ||
      reason === "invalid_grant" ||
      reason === "invalid_client"
    ) {
      throw new AuthExpiredError({
        provider: params.provider,
        message,
      });
    }

    throw new ProviderTransientError({
      provider: params.provider,
      message: `Token refresh failed with status ${refreshResponse.status}.`,
    });
  }

  const refreshedAccessToken =
    getString(refreshResponseBody, "access_token") ?? getString(refreshResponseBody, "accessToken");
  if (!refreshedAccessToken) {
    throw new ProviderTransientError({
      provider: params.provider,
      message: "Token refresh response did not include access token.",
    });
  }

  const updatedTokenContainer = buildUpdatedTokenContainer({
    tokenContainer,
    refreshResponse: refreshResponseBody,
    currentRefreshToken: currentAuth.refreshToken,
  });
  const updatedKey = writeUpdatedTokenContainer({
    root: tokenLocation.root,
    path: tokenLocation.path,
    updatedTokenContainer,
  });

  await persistCredentialKey(params.credential.id, updatedKey);
  params.credential.key = updatedKey;
};

export const getGoogleAuthWithRefresh = async (credential: CredentialLike): Promise<GoogleAuthTokens> => {
  await refreshAccessTokenIfExpired({ provider: CalendarProvider.GOOGLE, credential });
  return getGoogleAuth(credential);
};

export const getOutlookAuthWithRefresh = async (credential: CredentialLike): Promise<OutlookAuthTokens> => {
  await refreshAccessTokenIfExpired({ provider: CalendarProvider.OUTLOOK, credential });
  return getOutlookAuth(credential);
};
