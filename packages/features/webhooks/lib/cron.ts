/* Cron job for scheduled webhook events triggers */
import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { handleWebhookScheduledTriggers } from "./handleWebhookScheduledTriggers";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  await handleWebhookScheduledTriggers(prisma);

  res.json({ ok: true });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
