import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";

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
    timestamp,
  });

  // TODO: Validate instanceUrl + orgId against stored credentials
  // TODO: Sync changedFields to Cal.com user

  return res.status(200).json({ success: true });
}
