import { NextApiRequest, NextApiResponse } from "next";

import stripe from "@ee/lib/stripe/server";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check that user is authenticated
  const session = await getSession({ req: req });

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
      credentials: true,
      email: true,
      name: true,
    },
  });

  const stripeCredentials = user?.credentials.find(credentials);

  const stripeSession = await stripe.billingPortal.sessions.create({
    customer: user?.credentials,
    return_url: "https://app.cal.com/settings",
  });
  res.redirect(stripeSession.url);
}
