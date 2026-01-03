import type { NextApiRequest, NextApiResponse } from "next";

import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
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

  console.log(credential);
  // TODO: Validate instanceUrl + orgId against stored credentials
  // TODO: Sync changedFields to Cal.com user

  return res.status(200).json({ success: true });
}
