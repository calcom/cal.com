/// <reference types="stripe-event-types" />
import type Stripe from "stripe";

import billing from "../..";

const handleStripePaymentSuccess = async (
  data: Stripe.DiscriminatedEvent.CustomerSubscriptionEvent["data"]
) => {
  const subscription = data.object;
  await billing.handleTeamCancellation();
};

export default handleStripePaymentSuccess;
