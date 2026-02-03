import { getSalesforceAppKeys } from "./getSalesforceAppKeys";

/**
 * Calls Salesforce's token introspection endpoint to get the token lifetime.
 * Returns token lifetime in seconds (calculated from exp - iat).
 *
 * @see https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oidc_token_introspection_endpoint.htm
 */
export async function getSalesforceTokenLifetime({
  accessToken,
  instanceUrl,
}: {
  accessToken: string;
  instanceUrl: string;
}): Promise<number> {
  const { consumer_key, consumer_secret } = await getSalesforceAppKeys();

  const response = await fetch(`${instanceUrl}/services/oauth2/introspect`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${consumer_key}:${consumer_secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: accessToken,
      token_type_hint: "access_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token introspection failed: ${response.statusText}`);
  }

  const data = await response.json();

  // Calculate lifetime from exp and iat (both in seconds)
  // exp = expiration timestamp, iat = issued at timestamp
  const tokenLifetime = data.exp - data.iat;

  return tokenLifetime;
}
