import type { NextApiRequest, NextApiResponse } from "next";

import type { TGetDailyWebhooks } from "@calcom/app-store/dailyvideo/zod";
import { getDailyWebhooks } from "@calcom/core/getDailyWebhooks";
import { sendSendgridMail } from "@calcom/features/ee/workflows/lib/reminders/providers/sendgridProvider";
import { SENDER_NAME } from "@calcom/lib/constants";
import { defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const webhooks = await getDailyWebhooks();

  const inactiveWebhooks = webhooks.filter(
    (webhook: TGetDailyWebhooks[number]) => webhook.state !== "ACTIVE"
  );
  if (inactiveWebhooks.length) {
    // Notify by sending email
    await sendSendgridMail(
      {
        to: process.env.ALERT_EMAIL_TO,
        subject: "[HIGH] Alert: Daily Webhooks are not active",
        html: `<body style="white-space: pre-wrap;">Daily Webhook url api/recorded-daily-video is not functional.</body>`,
      },
      { sender: SENDER_NAME }
    );
  }

  res.json({ ok: true });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
