import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
} from "../../shared/output";
import type { OAuth2Client, OAuth2ClientResponse, OAuth2Tokens } from "./types";

export function renderOAuth2Client(
  data: OAuth2ClientResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const client = data?.data;
  if (!client) {
    console.log("OAuth2 client not found.");
    return;
  }

  renderHeader(`OAuth2 Client: ${client.name}`);
  renderDetail([
    ["Client ID:", client.client_id],
    ["Name:", client.name],
    ["Redirect URI:", client.redirect_uri],
    ["Client Type:", client.client_type],
    ["Trusted:", client.is_trusted ? "Yes" : "No"],
  ]);
}

export function renderOAuth2Tokens(
  data: OAuth2Tokens | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to obtain tokens.");
    return;
  }

  renderSuccess("OAuth2 tokens obtained successfully.");
  renderHeader("Tokens");
  renderDetail([
    ["Access Token:", data.access_token ? `${data.access_token.substring(0, 20)}...` : undefined],
    ["Refresh Token:", data.refresh_token ? `${data.refresh_token.substring(0, 20)}...` : undefined],
    ["Token Type:", data.token_type],
    ["Expires In:", data.expires_in ? `${data.expires_in} seconds` : undefined],
  ]);

  console.log("\nNote: Use --json flag to see full token values.");
}
