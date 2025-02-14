import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { stripeWebhookHandler } from "./__handler";

// We handle each Stripe webhook event type with it's own lazy loaded handler
const handlers = {
  "payment_intent.succeeded": () => import("./_payment_intent.succeeded"),
  "customer.subscription.deleted": () => import("./_customer.subscription.deleted"),
  "invoice.paid": () => import("./_invoice.paid"),
};

export default defaultHandler({
  POST: Promise.resolve({
    default: defaultResponder(stripeWebhookHandler(handlers)),
  }),
});
