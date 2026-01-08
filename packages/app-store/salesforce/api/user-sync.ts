import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { getAttributeSyncRuleService } from "@calcom/features/ee/integration-attribute-sync/di/AttributeSyncRuleService.container";
import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

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
    orgId,
    salesforceUserId,
    email,
    changedFields,
    timestamp,
  } = req.body;

  log.info("Received user sync request", {
    instanceUrl,
    orgId,
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
    log.error(`New credential found for ${instanceUrl}`);
    return res.status(400).json({ error: "Invalid instance URL" });
  }

  if (!credential?.teamId) {
    log.error(`Missing teamId for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid credential ID" });
  }

  const salesforceCredentialId = credential?.key?.id;

  if (!salesforceCredentialId) {
    log.error(`Missing SFDC id for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid credential ID" });
  }

  const sfdcOrgId = new URL(salesforceCredentialId).pathname.split("/")[2];

  if (sfdcOrgId !== orgId) {
    log.error(`Mismatched orgId ${orgId} for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid org ID" });
  }

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.findByEmailAndTeamId({
    email,
    teamId: credential.teamId,
  });

  if (!user) {
    log.error(
      `User not found for email ${email} and teamId ${credential.teamId}`
    );
    return res.status(400).json({ error: "Invalid user" });
  }

  // TODO: If introducing mutliple orgs for a single user, then we need to handle that here
  if (user.profiles.length === 0) {
    log.error(`User ${user.id} is not a part of an organization`);
    return res.status(400).json({ error: "Invalid user" });
  }

  const integrationAttributeSyncService = getIntegrationAttributeSyncService();

  const integrationAttributeSyncs =
    await integrationAttributeSyncService.getAllByCredentialId(credential.id);

  const attributeSyncRuleService = getAttributeSyncRuleService();

  await Promise.allSettled(
    integrationAttributeSyncs.map(async (sync) => {
      if (sync.attributeSyncRule) {
        const shouldSyncApplyToUser =
          await attributeSyncRuleService.shouldSyncApplyToUser({
            user: {
              id: user.id,
              organizationId: user.profiles[0].organizationId,
            },
            attributeSyncRule: sync.attributeSyncRule.rule,
          });

        if (!shouldSyncApplyToUser) return;
      }
    })
  );
  // TODO: Sync changedFields to Cal.com user

  return res.status(200).json({ success: true });
}
