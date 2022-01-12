// Create an endpoint Ex. DELETE /users/me
// There you can select user.metadata.stripeCustomerId
// Use that to call stripe.customers.delete
import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import stripe from "@ee/lib/stripe/server";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "DELETE") {
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
        metadata: true,
      },
    });

    if (!user?.email)
      return res.status(404).json({
        message: "User email not found",
      });

    let customerId = "";

    if (user?.metadata && typeof user.metadata === "object" && "stripeCustomerId" in user.metadata) {
      customerId = (user?.metadata as Prisma.JsonObject).stripeCustomerId as string;
    } else {
      /* We fallback to finding the customer by email (which is not optimal) */
      const customersReponse = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      if (customersReponse.data[0]?.id) {
        customerId = customersReponse.data[0].id;
      }
    }

    if (!customerId)
      return res.status(404).json({
        message: "Stripe customer id not found",
      });

    //delete stripe customer
    await stripe.customers.del(customerId);

    res.status(201).json({
      message: "Stripe account deleted",
    });
  }
}
