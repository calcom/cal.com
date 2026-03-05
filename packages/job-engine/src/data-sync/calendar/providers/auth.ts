import { AuthExpiredError, CalendarProvider, ProviderPermanentError, type CredentialLike } from "./types";

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

const parseExpiryDate = (tokenData: UnknownRecord): number | null => {
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

const findTokenContainer = (key: unknown): UnknownRecord | null => {
  const root = asRecord(key);
  if (!root) {
    return null;
  }

  const nestedCandidates = [
    root,
    asRecord(root.credentials),
    asRecord(root.oauth),
    asRecord(root.oauth2),
    asRecord(root.token),
    asRecord(root.tokens),
  ];

  for (const candidate of nestedCandidates) {
    if (!candidate) {
      continue;
    }
    if (getString(candidate, "access_token") || getString(candidate, "accessToken")) {
      return candidate;
    }
  }

  return root;
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
  const tokenContainer = findTokenContainer(credential.key);
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
  const tokenContainer = findTokenContainer(credential.key);
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
