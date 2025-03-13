import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";

import { stripeWebhookHandler } from "./__handler";

export const POST = defaultResponderForAppDir(
  // We handle each Stripe webhook event type with it's own lazy loaded handler
  stripeWebhookHandler({
    "payment_intent.succeeded": () => import("./_payment_intent.succeeded"),
    "customer.subscription.deleted": () => import("./_customer.subscription.deleted"),
  })
);
