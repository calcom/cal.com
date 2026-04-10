import jsforce from "@jsforce/jsforce-node";

import { WEBAPP_URL } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";

import { getSalesforceAppKeys } from "./getSalesforceAppKeys";

/**
 * Creates a jsforce Connection from a credential ID. This is a lightweight
 * alternative to instantiating the full SalesforceCRMService when you only
 * need to call describe() or similar read-only operations.
 *
 * Accepts an optional PrismaClient for testability.
 */
export async function createSalesforceConnection(credentialId: number, db: PrismaClient = defaultPrisma) {
  const credential = await db.credential.findUniqueOrThrow({
    where: { id: credentialId },
    select: { key: true },
  });

  const credentialKey = credential.key as Record<string, unknown>;

  const instanceUrl = credentialKey.instance_url as string | undefined;
  const accessToken = credentialKey.access_token as string | undefined;
  const refreshToken = credentialKey.refresh_token as string | undefined;

  if (!instanceUrl || !accessToken) {
    throw new Error("Salesforce credential is missing instance_url or access_token");
  }

  const { consumer_key, consumer_secret } = await getSalesforceAppKeys();

  return new jsforce.Connection({
    oauth2: {
      clientId: consumer_key,
      clientSecret: consumer_secret,
      redirectUri: `${WEBAPP_URL}/api/integrations/salesforce/callback`,
    },
    instanceUrl,
    accessToken,
    refreshToken,
  });
}
