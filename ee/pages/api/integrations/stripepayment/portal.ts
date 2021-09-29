import type { NextApiRequest, NextApiResponse } from "next";

import stripe from "@ee/lib/stripe/server";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Check that user is authenticated
    const session = await getSession({ req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: {
        id: session.user?.id,
      },
      select: {
        email: true,
        name: true,
      },
    });

    if (!user?.email)
      return res.status(404).json({
        message: "User email not found",
      });

    /**
     * TODO: We need to find a better way to get our users customer id from Stripe,
     * since the email is not an unique field in Stripe and we don't save them
     * in our DB as of now.
     **/
    const customersReponse = await stripe.customers.list({
      email: user?.email || "",
      limit: 1,
    });

    const [customer] = customersReponse.data;

    if (!customer?.id)
      return res.status(404).json({
        message: "Stripe customer id not found",
      });

    const return_url = `${process.env.BASE_URL}/settings/billing`;
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url,
    });

    res.redirect(302, stripeSession.url);
  }
}
