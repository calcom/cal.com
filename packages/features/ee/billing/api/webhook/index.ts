import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { stripeWebhookHandler } from "./__handler";

// We handle each Stripe webhook event type with it's own lazy loaded handler
const handlers = {
  "payment_intent.succeeded": () => import("./_payment_intent.succeeded"),
  "customer.subscription.deleted": () => import("./_customer.subscription.deleted"),
  "customer.subscription.updated": () => import("./_customer.subscription.updated"),
  "invoice.paid": () => import("./_invoice.paid"),
  "checkout.session.completed": () => import("./_checkout.session.completed"),
};

export default defaultHandler({
  POST: Promise.resolve({
    default: defaultResponder(stripeWebhookHandler(handlers)),
  }),
});
