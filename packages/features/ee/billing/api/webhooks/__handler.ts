/// <reference types="stripe-event-types" />
import { buffer } from "micro";
import type { NextApiRequest } from "next";
import type Stripe from "stripe";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { HttpError } from "@calcom/lib/http-error";

/** Stripe Webhook Handler Mappings */
export type SWHMap = {
  [T in Stripe.DiscriminatedEvent as T["type"]]: {
    [K in keyof T as Exclude<K, "type">]: T[K];
  };
};

type SWHandlers = {
  [K in keyof SWHMap]?: Promise<{
    default: (data: SWHMap[K]["data"]) => unknown | Promise<unknown>;
  }>;
};

/** Just a shorthand for HttpError  */
class HttpCode extends HttpError {
  constructor(statusCode: number, message: string) {
    super({ statusCode, message });
  }
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Allows us to split big API handlers by webhook event, and lazy load them.
 * It already handles the Stripe signature verification and event construction.
 * @param handlers - A mapping of Stripe webhook event types to lazy loaded handlers.
 * @returns A function that can be used as a Next.js API handler.
 * @example
 * ```ts
 * stripeWebhookHandler({
 *   "payment_intent.succeeded": import("./_lazyLoadedSuccessHandler"),
 *   "customer.subscription.deleted": import("./_customer.subscription.deleted"),
 * })
 * ```
 */
export const stripeWebhookHandler = (handlers: SWHandlers) => async (req: NextApiRequest) => {
  const sig = req.headers["stripe-signature"];
  if (!sig) throw new HttpCode(400, "Missing stripe-signature");
  if (!STRIPE_WEBHOOK_SECRET) throw new HttpCode(500, "Missing STRIPE_WEBHOOK_SECRET");
  const requestBuffer = await buffer(req);
  const payload = requestBuffer.toString();
  const event = stripe.webhooks.constructEvent(
    payload,
    sig,
    STRIPE_WEBHOOK_SECRET
  ) as Stripe.DiscriminatedEvent;
  const handler = (await handlers[event.type])?.default;
  // auto catch unsupported Stripe events.
  if (!handler) throw new HttpCode(202, `Unhandled Stripe Webhook event type ${event.type}`);
  // @ts-expect-error - we know the handler is defined and accpets the data type
  await handler(event.data);
};
