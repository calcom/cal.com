export type OAuthTokenPayload = {
  userId?: number | null;
  teamId?: number | null;
  token_type: string;
  scope: string[];
  clientId: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
};
