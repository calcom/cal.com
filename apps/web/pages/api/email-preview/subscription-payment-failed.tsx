import type { NextApiRequest, NextApiResponse } from "next";

import renderEmail from "@calcom/emails/src/renderEmail";
import { getTranslation } from "@calcom/lib/server/i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ message: "Not found" });
  }

  const t = await getTranslation("en", "common");

  const html = await renderEmail("SubscriptionPaymentFailedEmail", {
    entityName: req.query.entityName?.toString() || "Acme Team",
    billingPortalUrl:
      req.query.billingPortalUrl?.toString() || "https://billing.stripe.com/p/session/test_example",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "support@cal.com",
    language: { translate: t },
  });

  res.setHeader("Content-Type", "text/html");
  res.send(html);
}
