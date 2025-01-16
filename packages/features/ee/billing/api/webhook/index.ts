import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { stripeWebhookHandler } from "./__handler";

// We handle each Stripe webhook event type with it's own lazy loaded handler
const handlers = {
  "payment_intent.succeeded": () => import("./_payment_intent.succeeded"),
  "invoice.paid": () => import("./_invoice.paid"),
  "customer.subscription.deleted": () => import("./_customer.subscription.deleted"),
  "customer.subscription.deleted.team-plan": () => import("./_customer.subscription.deleted.team-plan"),
};

export default defaultHandler({
  POST: Promise.resolve({
    default: defaultResponder(stripeWebhookHandler(handlers)),
  }),
});
