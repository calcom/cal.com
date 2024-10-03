import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { stripeWebhookHandler } from "./__handler";

export default defaultHandler({
  // We only need to handle POST requests
  POST: Promise.resolve({
    default: defaultResponder(
      // We handle each Stripe webhook event type with it's own lazy loaded handler
      stripeWebhookHandler({
        "payment_intent.succeeded": () => import("./_payment_intent.succeeded"),
        // "customer.subscription.updated": () => import("./_customer.subscription.deleted"),
        "customer.subscription.deleted": () => import("./_customer.subscription.deleted"),
      })
    ),
  }),
});
