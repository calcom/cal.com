import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { getAttributeSyncFieldMappingService } from "@calcom/features/ee/integration-attribute-sync/di/AttributeSyncFieldMappingService.container";
import { getAttributeSyncRuleService } from "@calcom/features/ee/integration-attribute-sync/di/AttributeSyncRuleService.container";
import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

const log = logger.getSubLogger({ prefix: ["[salesforce/user-sync]"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { instanceUrl, orgId: sfdcOrgId, salesforceUserId, email, changedFields, timestamp } = req.body;

  log.info("Received user sync request", {
    instanceUrl,
    sfdcOrgId,
    salesforceUserId,
    email,
    changedFields,
    timestamp,
  });

  const credentialRepository = new CredentialRepository(prisma);
  const credential = await credentialRepository.findByAppIdAndKeyValue({
    appId: "salesforce",
    keyPath: ["instance_url"],
    value: instanceUrl,
    keyFields: ["id"],
  });

  if (!credential) {
    log.error(`No credential found for ${instanceUrl}`);
    return res.status(400).json({ error: "Invalid instance URL" });
  }

  if (!credential?.teamId) {
    log.error(`Missing teamId for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid credential ID" });
  }

  const salesforceCredentialId = (credential.key as { id?: string } | null)?.id;

  if (!salesforceCredentialId) {
    log.error(`Missing SFDC id for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid credential ID" });
  }

  let storedSfdcOrgId: string | undefined;
  try {
    storedSfdcOrgId = new URL(salesforceCredentialId).pathname.split("/")[2];
  } catch {
    log.error(`Invalid SFDC credential URL format for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid credential format" });
  }

  if (storedSfdcOrgId !== sfdcOrgId) {
    log.error(`Mismatched orgId ${sfdcOrgId} for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid org ID" });
  }

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.findByEmailAndTeamId({
    email,
    teamId: credential.teamId,
  });

  if (!user) {
    log.error(`User not found for email ${email} and teamId ${credential.teamId}`);
    return res.status(400).json({ error: "Invalid user" });
  }

  const organizationId = credential.teamId;

  const integrationAttributeSyncService = getIntegrationAttributeSyncService();

  const integrationAttributeSyncs = await integrationAttributeSyncService.getAllByCredentialId(credential.id);

  const attributeSyncRuleService = getAttributeSyncRuleService();
  const attributeSyncFieldMappingService = getAttributeSyncFieldMappingService();

  const results = await Promise.allSettled(
    integrationAttributeSyncs.map(async (sync) => {
      // Only check rule if one exists - skip sync only if rule returns false
      if (sync.attributeSyncRule) {
        const shouldSyncApplyToUser = await attributeSyncRuleService.shouldSyncApplyToUser({
          user: {
            id: user.id,
            organizationId,
          },
          attributeSyncRule: sync.attributeSyncRule.rule,
        });

        if (!shouldSyncApplyToUser) return;
      }

      // Salesforce multi-select picklists use `;` as separator, convert to `,` for the service
      const integrationFields = Object.fromEntries(
        Object.entries(changedFields as Record<string, unknown>)
          .filter(([, value]) => value != null)
          .map(([key, value]) => [key, String(value).replaceAll(";", ",")])
      );

      await attributeSyncFieldMappingService.syncIntegrationFieldsToAttributes({
        userId: user.id,
        organizationId,
        syncFieldMappings: sync.syncFieldMappings,
        integrationFields,
      });
    })
  );

  const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

  if (errors.length > 0) {
    log.error("Errors syncing user attributes", {
      errors: errors.map((e) => e.reason),
    });
  }

  return res.status(200).json({ success: true });
}
