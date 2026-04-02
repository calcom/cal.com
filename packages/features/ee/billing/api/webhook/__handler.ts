/// <reference types="stripe-event-types" />

import process from "node:process";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { HttpError } from "@calcom/lib/http-error";
import { buffer } from "micro";
import type { NextApiRequest } from "next";
import type Stripe from "stripe";

/** Stripe Webhook Handler Mappings */
export type SWHMap = {
  [T in Stripe.DiscriminatedEvent as T["type"]]: {
    [K in keyof T as Exclude<K, "type">]: T[K];
  };
};

export type LazyModule<D> = Promise<{
  default: (data: D) => unknown | Promise<unknown>;
}>;

type SWHandlers = {
  [K in keyof SWHMap]?: () => LazyModule<SWHMap[K]["data"]>;
};

/** Just a shorthand for HttpError  */
export class HttpCode extends HttpError {
  constructor(statusCode: number, message: string) {
    super({ statusCode, message });
  }
}

/**
 * Allows us to split big API handlers by webhook event, and lazy load them.
 * It already handles the Stripe signature verification and event construction.
 * @param handlers - A mapping of Stripe webhook event types to lazy loaded handlers.
 * @returns A function that can be used as a Next.js API handler.
 * @example
 * ```ts
 * stripeWebhookHandler({
 *   "payment_intent.succeeded": () => import("./_lazyLoadedSuccessHandler"),
 *   "customer.subscription.deleted": () => import("./_customer.subscription.deleted"),
 * })
 * ```
 */
export const stripeWebhookHandler = (handlers: SWHandlers) => async (req: NextApiRequest) => {
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_BILLING;
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
  const handlerGetter = handlers[event.type];
  if (!handlerGetter) {
    console.log("Unhandled Stripe Webhook event type", event.type);
    return {
      success: false,
      message: `Unhandled Stripe Webhook event type ${event.type}`,
    };
  }
  const handler = (await handlerGetter())?.default;
  // auto catch unsupported Stripe events.
  if (!handler) {
    console.log("Unhandled Stripe Webhook event type", event.type);
    return {
      success: false,
      message: `Unhandled Stripe Webhook event type ${event.type}`,
    };
  }
  // @ts-expect-error - we know the handler is defined and accepts the data type
  return await handler(event.data);
};
