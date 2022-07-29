import type { NextApiRequest, NextApiResponse } from "next";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const customerId = await getStripeCustomerIdFromUserId(req.session!.user.id);

    if (!customerId) {
      res.status(500).json({ message: "Missing customer id" });
      return;
    }

    const return_url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/billing`;
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    res.redirect(302, stripeSession.url);
  }
}
