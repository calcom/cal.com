export interface DubOAuthToken {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  expiry_date?: number;
  scope: string;
}
