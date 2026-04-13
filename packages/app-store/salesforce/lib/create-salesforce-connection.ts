import jsforce from "@jsforce/jsforce-node";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { getSalesforceAppKeys } from "./getSalesforceAppKeys";
import { refreshSalesforceToken } from "./refresh-salesforce-token";

const log = logger.getSubLogger({ prefix: ["createSalesforceConnection"] });

/**
 * Creates a jsforce Connection from a credential ID with proper token
 * refresh handling. Checks token validity before connecting and sets up
 * a refreshFn callback for in-flight expiration.
 */
export async function createSalesforceConnection(credentialId: number) {
  const credential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    select: { key: true },
  });

  const credentialKey = credential.key as Record<string, unknown>;

  let instanceUrl = credentialKey.instance_url as string | undefined;
  let accessToken = credentialKey.access_token as string | undefined;
  const refreshToken = credentialKey.refresh_token as string | undefined;
  const issuedAt = parseInt(String(credentialKey.issued_at ?? "0"), 10);
  const tokenLifetime = credentialKey.token_lifetime as number | undefined;

  if (!instanceUrl || !accessToken) {
    throw new Error(`Salesforce credential ${credentialId} is missing instance_url or access_token`);
  }

  if (!refreshToken) {
    throw new Error(`Salesforce credential ${credentialId} is missing refresh_token`);
  }

  const { consumer_key, consumer_secret } = await getSalesforceAppKeys();

  const BUFFER_MS = 5 * 60 * 1000;
  const tokenLifetimeMs = (tokenLifetime || 0) * 1000;
  const isTokenValid = tokenLifetime && Date.now() < issuedAt + tokenLifetimeMs - BUFFER_MS;

  if (!isTokenValid) {
    try {
      const result = await refreshSalesforceToken({
        credentialId,
        refreshToken,
        existingTokenLifetime: tokenLifetime,
      });
      accessToken = result.accessToken;
      instanceUrl = result.instanceUrl;
    } catch (err) {
      log.error("Pre-flight token refresh failed", { credentialId, err });
      throw new Error(
        `Salesforce token expired and refresh failed for credential ${credentialId}. Re-authenticate in Settings → Apps → Salesforce.`
      );
    }
  }

  let hasAttemptedRefresh = false;

  return new jsforce.Connection({
    oauth2: {
      clientId: consumer_key,
      clientSecret: consumer_secret,
      redirectUri: `${WEBAPP_URL}/api/integrations/salesforce/callback`,
    },
    instanceUrl,
    accessToken,
    refreshToken,
    refreshFn: async (_conn, callback) => {
      if (hasAttemptedRefresh) {
        return callback(new Error("Token refresh already attempted for this connection"));
      }
      hasAttemptedRefresh = true;

      try {
        const result = await refreshSalesforceToken({ credentialId, refreshToken });
        callback(null, result.accessToken);
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });
}
