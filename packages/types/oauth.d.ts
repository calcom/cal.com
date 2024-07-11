export type OAuthTokenPayload = {
  userId?: number | null;
  teamId?: number | null;
  token_type: string;
  scope: string[];
  clientId: string;
};
