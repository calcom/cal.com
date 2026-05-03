import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
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

  return res.status(200).json({ success: true });
}
