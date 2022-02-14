import type { NextApiRequest, NextApiResponse } from "next";

import { getStripeCustomerFromUser } from "@ee/lib/stripe/customer";
import stripe from "@ee/lib/stripe/server";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Check that user is authenticated
    const session = await getSession({ req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const customerId = await getStripeCustomerFromUser(session.user.id);

    if (!customerId) {
      res.status(500).json({ message: "Missing customer id" });
      return;
    }

    const return_url = `${process.env.BASE_URL}/settings/billing`;
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    res.redirect(302, stripeSession.url);
  }
}
