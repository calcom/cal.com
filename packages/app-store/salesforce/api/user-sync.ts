// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getAttributeSyncRuleService } from "@calcom/features/ee/integration-attribute-sync/di/AttributeSyncRuleService.container";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { IntegrationAttributeSyncOutputMapper } from "@calcom/features/ee/integration-attribute-sync/mappers/IntegrationAttributeSyncOutputMapper";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getAttributeSyncFieldMappingService } from "@calcom/features/ee/integration-attribute-sync/di/AttributeSyncFieldMappingService.container";

const log = logger.getSubLogger({ prefix: ["[salesforce/user-sync]"] });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    instanceUrl,
    orgId: sfdcOrgId,
    salesforceUserId,
    email,
    changedFields,
    timestamp,
  } = req.body;

  log.info("Received user sync request", {
    instanceUrl,
    sfdcOrgId,
    salesforceUserId,
    email,
    changedFields,
    timestamp,
  });

  const credentialRepository = new CredentialRepository(prisma);
  const allCredentials =
    await credentialRepository.findAllByAppIdAndKeyValueWithSyncs({
      appId: "salesforce",
      keyPath: ["instance_url"],
      value: instanceUrl,
      keyFields: ["id"],
    });

  if (allCredentials.length === 0) {
    log.error(`No credentials with attribute syncs found for ${instanceUrl}`);
    return res.status(400).json({ error: "Invalid instance URL" });
  }

  const credentials = allCredentials.filter((cred) => {
    const sfdcId = (cred.key as { id?: string } | null)?.id;
    if (!sfdcId) return false;
    try {
      return new URL(sfdcId).pathname.split("/")[2] === sfdcOrgId;
    } catch {
      return false;
    }
  });

  if (credentials.length === 0) {
    log.error(`No credentials matching orgId ${sfdcOrgId} for ${instanceUrl}`);
    return res.status(400).json({ error: "Invalid org ID" });
  }

  const userRepository = new UserRepository(prisma);
  const attributeSyncRuleService = getAttributeSyncRuleService();
  const attributeSyncFieldMappingService =
    getAttributeSyncFieldMappingService();

  const results = await Promise.allSettled(
    credentials.map(async (credential) => {
      if (!credential.teamId) {
        log.error(`Missing teamId for credential ${credential.id}`);
        return;
      }

      // Only organization scoped credentials are used for attribute syncing
      const organizationId = credential.teamId;

      const user = await userRepository.findByEmailAndTeamId({
        email,
        teamId: organizationId,
      });

      if (!user) {
        log.warn(
          `User not found for email ${email} and teamId ${organizationId}`
        );
        return;
      }

      // Salesforce multi-select picklists use `;` as separator, convert to `,` for the service
      const integrationFields = Object.fromEntries(
        Object.entries(changedFields as Record<string, unknown>)
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value).replaceAll(";", ",")])
      );

      for (const sync of credential.integrationAttributeSyncs) {
        try {
          if (sync.attributeSyncRule) {
            const shouldSyncApplyToUser =
              await attributeSyncRuleService.shouldSyncApplyToUser({
                user: {
                  id: user.id,
                  organizationId,
                },
                attributeSyncRule:
                  IntegrationAttributeSyncOutputMapper.attributeSyncRuleToDomain(
                    sync.attributeSyncRule
                  ).rule,
              });

            if (!shouldSyncApplyToUser) continue;
          }

          await attributeSyncFieldMappingService.syncIntegrationFieldsToAttributes(
            {
              userId: user.id,
              organizationId,
              syncFieldMappings: sync.syncFieldMappings,
              integrationFields,
            }
          );
        } catch (err) {
          log.error(`Failed to process sync ${sync.id}`, { error: err });
        }
      }
    })
  );

  const errors = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );

  if (errors.length > 0) {
    log.error("Errors syncing user attributes", {
      errors: errors.map((e) => e.reason),
    });
  }

  return res.status(200).json({ success: true });
}
