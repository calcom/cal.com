/// <reference types="stripe-event-types" />

import stripe from "@calcom/features/ee/payments/server/stripe";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { buffer } from "micro";
import type { NextApiRequest } from "next";
import type Stripe from "stripe";

const log = logger.getSubLogger({ prefix: ["stripe-webhook-handler"] });

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
    log.warn("Unhandled Stripe Webhook event type", { eventType: event.type });
    return {
      success: false,
      message: `Unhandled Stripe Webhook event type ${event.type}`,
    };
  }
  const handler = (await handlerGetter())?.default;
  // auto catch unsupported Stripe events.
  if (!handler) {
    log.warn("Unhandled Stripe Webhook event type", { eventType: event.type });
    return {
      success: false,
      message: `Unhandled Stripe Webhook event type ${event.type}`,
    };
  }
  // @ts-expect-error - we know the handler is defined and accepts the data type
  return await handler(event.data);
};

/**
 * Routes webhook events to sub-handlers based on the Stripe product ID.
 * Eliminates the need for each event handler to implement its own product routing.
 * @param handlers - A mapping of Stripe product IDs to lazy loaded handlers.
 * @param extractProductId - A function that extracts the product ID from the event data.
 * @example
 * ```ts
 * productRouter(
 *   {
 *     [STRIPE_ORG_PRODUCT_ID]: () => import("./_invoice.paid.org"),
 *     [STRIPE_TEAM_PRODUCT_ID]: () => import("./_invoice.paid.team"),
 *   },
 *   (data) => data.object.lines.data[0]?.price?.product as string | null
 * )
 * ```
 */
export function productRouter<D>(
  handlers: Record<string, () => LazyModule<D>>,
  extractProductId: (data: D) => string | null
) {
  return async (data: D) => {
    const productId = extractProductId(data);
    if (!productId) {
      log.warn("No product ID found, skipping");
      return { success: false, message: "No product ID found" };
    }
    const handlerGetter = handlers[productId];
    if (!handlerGetter) {
      log.warn(`No handler for product: ${productId}`);
      return { success: false, message: `Unhandled product: ${productId}` };
    }
    const handler = (await handlerGetter())?.default;
    if (!handler) {
      log.warn(`Handler module missing default export for product: ${productId}`);
      return { success: false, message: `No handler for product: ${productId}` };
    }
    return handler(data);
  };
}

/**
 * Routes webhook events to sub-handlers based on a metadata `type` field.
 * Used for checkout sessions where different purchase types share the same Stripe event.
 * @param handlers - A mapping of metadata type values to lazy loaded handlers.
 * @example
 * ```ts
 * metadataRouter({
 *   [CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION]: () => import("./_checkout.session.completed.phone"),
 *   [CHECKOUT_SESSION_TYPES.CREDIT_PURCHASE]: () => import("./_checkout.session.completed.credits"),
 * })
 * ```
 */
export function metadataRouter<D extends { object: { metadata?: Record<string, string> | null } }>(
  handlers: Record<string, () => LazyModule<D>>
) {
  return async (data: D) => {
    const type = data.object.metadata?.type;
    if (!type) {
      log.warn("No metadata type found on event, skipping");
      return { success: false, message: "No metadata type found" };
    }
    const handlerGetter = handlers[type];
    if (!handlerGetter) {
      log.warn(`No handler for metadata type: ${type}`);
      return { success: false, message: `Unhandled metadata type: ${type}` };
    }
    const handler = (await handlerGetter())?.default;
    if (!handler) {
      log.warn(`Handler module missing default export for metadata type: ${type}`);
      return { success: false, message: `No handler for metadata type: ${type}` };
    }
    return handler(data);
  };
}
