/// <reference types="stripe-event-types" />
import type Stripe from "stripe";

import { prisma } from "@calcom/prisma";

const handleStripePaymentSuccess = async (data: Stripe.DiscriminatedEvent.PaymentIntentEvent["data"]) => {
  const paymentIntent = data.object;
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: paymentIntent.id,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });
};

export default handleStripePaymentSuccess;
