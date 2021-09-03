import prisma from "@lib/prisma";
import { createPaymentIntent } from "@lib/stripe/server";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { username, eventTypeId } = req.body;
      const currentUser = await prisma.user.findFirst({
        where: {
          username: username as string,
        },
        select: {
          id: true,
          credentials: true,
          email: true,
          name: true,
        },
      });

      if (!currentUser) throw "noUser";

      const eventType = await prisma.eventType.findFirst({
        where: {
          userId: currentUser.id,
          id: parseInt(eventTypeId),
        },
        select: {
          id: true,
          eventName: true,
          title: true,
          price: true,
        },
      });

      if (!eventType) throw "noEventType";

      const [stripeCredentials] = currentUser.credentials.filter((cred) => cred.type === "stripe");
      const { stripe_user_id } = JSON.parse(stripeCredentials.key as string) as Stripe.OAuthToken;
      const payment_intent = await createPaymentIntent(eventType.price, stripe_user_id);
      res.status(200).json(payment_intent);
    } catch (err) {
      res.status(500).json({ statusCode: 500, message: err.message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
