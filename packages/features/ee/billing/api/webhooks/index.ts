import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { stripeWebhookHandler } from "./__handler";

export default defaultHandler({
  GET: Promise.resolve({
    default: defaultResponder(
      stripeWebhookHandler({
        "payment_intent.succeeded": import("./_payment_intent.succeeded"),
        "customer.subscription.deleted": import("./_customer.subscription.deleted"),
      })
    ),
  }),
});
