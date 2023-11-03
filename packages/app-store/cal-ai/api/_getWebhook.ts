import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";

import { defaultResponder } from "@calcom/lib/server";

import appConfig from "../config.json";
import { stripe } from "../lib/stripe";

const relevantEvents = new Set([
  "customer.subscription.updated",
  "checkout.session.completed",
  "customer.subscription.deleted",
]);

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const slug = appConfig.slug;
  const appType = appConfig.type;

  const buf = req.body;
  const stripeSig = req.headers["Stripe-Signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (!stripeSig || !webhookSecret) {
      return res.status(400).json({ message: "Failed to parse Stripe Signature or WebhookSecret" });
    }
    event = stripe.webhooks.constructEvent(buf, stripeSig, webhookSecret);

    if (relevantEvents.has(event.type)) {
      if (event.type === "checkout.session.completed") {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.mode === "payment") return res.status(200);

        if (checkoutSession.client_reference_id) {
          const userId = Number.parseInt(checkoutSession.client_reference_id);

          // todo begin subscription data
        }
      }
    }
  } catch (err) {
    return res.status(400).json({ message: "Failed to create Stripe Event", error: err });
  }
}

export default defaultResponder(getHandler);
