// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import logger from "@calcom/lib/logger";

import parseRefreshTokenResponse from "../../_utils/oauth/parseRefreshTokenResponse";
import { getSalesforceAppKeys } from "./getSalesforceAppKeys";
import { getSalesforceTokenLifetime } from "./getSalesforceTokenLifetime";
import { salesforceTokenSchema } from "./salesforce-token-schema";

const log = logger.getSubLogger({ prefix: ["refreshSalesforceToken"] });

interface RefreshResult {
  accessToken: string;
  instanceUrl: string;
  issuedAt: string;
  tokenLifetime: number | undefined;
}

/**
 * Refreshes a Salesforce access token via the OAuth2 token endpoint.
 * Persists the new token + lifetime to the Credential row.
 *
 * @param forceIntrospection — re-introspect token_lifetime even if one exists
 *   (useful after an unexpected mid-flight expiry to recalibrate)
 */
export async function refreshSalesforceToken({
  credentialId,
  refreshToken,
  forceIntrospection = false,
  existingTokenLifetime,
}: {
  credentialId: number;
  refreshToken: string;
  forceIntrospection?: boolean;
  existingTokenLifetime?: number;
}): Promise<RefreshResult> {
  const { consumer_key, consumer_secret } = await getSalesforceAppKeys();

  const response = await fetch("https://login.salesforce.com/services/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: consumer_key,
      client_secret: consumer_secret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = `${response.statusText}: ${JSON.stringify(body)}`;
    log.error("Token refresh failed", { credentialId, status: response.status });
    throw new Error(`Salesforce token refresh failed: ${message}`);
  }

  const parsed = parseRefreshTokenResponse(await response.json(), salesforceTokenSchema);

  let tokenLifetime = existingTokenLifetime;
  if (forceIntrospection || !tokenLifetime) {
    tokenLifetime = await getSalesforceTokenLifetime({
      accessToken: parsed.access_token,
      instanceUrl: parsed.instance_url,
    });
  }

  await CredentialRepository.updateWhereId({
    id: credentialId,
    data: {
      key: { ...parsed, refresh_token: refreshToken, token_lifetime: tokenLifetime },
    },
  });

  return {
    accessToken: parsed.access_token,
    instanceUrl: parsed.instance_url,
    issuedAt: parsed.issued_at,
    tokenLifetime,
  };
}
