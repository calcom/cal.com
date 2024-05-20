import type { NextApiRequest, NextApiResponse } from "next";

import DailyVideoApiAdapter from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter.ts";
import { defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const webhooks = await DailyVideoApiAdapter.getWebhooks();

  const inactiveWebhooks = webhooks.filter((webhook) => webhook.state !== "ACTIVE");
  if (inactiveWebhooks.length) {
    // Notify by sending email
  }

  res.json({ ok: true });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
