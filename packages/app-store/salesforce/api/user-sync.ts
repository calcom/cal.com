import type { NextApiRequest, NextApiResponse } from "next";

import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
// import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[salesforce/user-sync]"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { instanceUrl, orgId, salesforceUserId, email, changedFields, timestamp } = req.body;

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

  const salesforceCredentialId = credential?.key?.id;

  if (!salesforceCredentialId) {
    log.error(`Missing SFDC id for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid credential ID" });
  }

  const sfdcOrgId = new URL(salesforceCredentialId).pathname.split("/")[1];
  console.log(sfdcOrgId);

  if (sfdcOrgId !== orgId) {
    log.error(`Mismatched orgId ${orgId} for credential ${credential.id}`);
    return res.status(400).json({ error: "Invalid org ID" });
  }

  // TODO: Sync changedFields to Cal.com user

  return res.status(200).json({ success: true });
}
