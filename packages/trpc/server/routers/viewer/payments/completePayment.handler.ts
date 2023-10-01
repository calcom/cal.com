import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import appStore from "@calcom/app-store";
import type { PrismaClient } from "@calcom/prisma";
import type { PaymentApp } from "@calcom/types/PaymentService";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZCompletePaymentInputSchema } from "./completePayment.schema";

interface CompletePaymentHandlerOptions {
  ctx: { user: NonNullable<TrpcSessionUser>; prisma: PrismaClient };
  input: ZCompletePaymentInputSchema;
}

export const completePaymentHandler = async ({ ctx, input }: CompletePaymentHandlerOptions) => {
  const { prisma } = ctx;

  const booking = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
    },
    include: {
      payment: true,
      user: true,
      attendees: true,
      eventType: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const eventType = booking.eventType;
  const attendee = booking.attendees[0];

  const previousPayment = booking.payment[0];

  if (!previousPayment) {
    /**
     * Here maybe charge full amount.
     */
    throw new Error("No previous payment");
  }

  const customerId =
    previousPayment.paymentOption === "HOLD"
      ? previousPayment.data.setupIntent.customer
      : previousPayment.data.customer;

  const paymentCredential = await prisma.credential.findFirst({
    where: {
      userId: ctx.user.id,
      appId: booking.payment[0].appId,
    },
    include: {
      app: true,
    },
  });

  if (!paymentCredential?.app) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment credential" });
  }

  const paymentApp = (await appStore[
    paymentCredential?.app?.dirName as keyof typeof appStore
  ]()) as PaymentApp;

  if (!paymentApp?.lib?.PaymentService) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment service not found" });
  }

  const credentials = paymentCredential.key;

  if (!credentials) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment credential" });
  }

  // const customer = await retrieveOrCreateStripeCustomerByEmail("", paymentCredential.key.stripe_user_id);

  const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY, {
    apiVersion: "2020-08-27",
  });

  // Ensure that the stripe customer & payment method still exists
  const customer = await stripe.customers.retrieve(customerId as string, {
    stripeAccount: credentials.stripe_user_id,
  });

  if (!customer) {
    throw new Error(`Stripe customer does not exist for booking ${input.bookingId}`);
  }

  const paymentMethods = await stripe.paymentMethods.list(
    {
      customer: customer.id,
      type: "card",
    },
    {
      stripeAccount: credentials.stripe_user_id,
    }
  );

  const paymentMethod = paymentMethods.data[0];

  if (!paymentMethod) {
    throw new Error(`Stripe paymentMethod does not exist for booking ${input.bookingId}`);
  }

  const amount =
    previousPayment.paymentOption === "HOLD" ? eventType.price : eventType.price - previousPayment.amount;

  const params = {
    amount: amount,
    currency: previousPayment.currency ?? previousPayment.data.currency ?? "usd",
    application_fee_amount: 0,
    customer: customerId,
    payment_method: paymentMethod.id,
    off_session: true,
    confirm: true,
    metadata: {
      skipWebhook: true,
    },
  };

  /** Charge customer */

  const paymentIntent = await stripe.paymentIntents.create(params, {
    stripeAccount: credentials.stripe_user_id,
  });

  /** Create new internal payment record and update payment status */

  const paymentUpdate =
    previousPayment.paymentOption === "HOLD"
      ? prisma.payment.update({
          where: {
            id: previousPayment.id,
          },
          data: {
            success: true,
          },
        })
      : prisma.payment.create({
          data: {
            uid: uuidv4(),
            app: {
              connect: {
                slug: "stripe",
              },
            },
            booking: {
              connect: {
                id: input.bookingId,
              },
            },
            amount: amount,
            currency: previousPayment.data.currency,
            externalId: paymentIntent.id,
            data: Object.assign({}, paymentIntent, {
              stripe_publishable_key: credentials.stripe_publishable_key,
              stripeAccount: credentials.stripe_user_id,
            }) as unknown as Prisma.InputJsonValue,
            fee: 0,
            refunded: false,
            success: true,
            paymentOption: "ON_BOOKING",
          },
        });

  const bookingUpdate = prisma.booking.update({
    where: {
      id: input.bookingId,
    },
    data: {
      paymentStatus: "PAID",
    },
  });

  await prisma.$transaction([paymentUpdate, bookingUpdate]);

  /** Update booking payment status from PARTIAL to PAID */
  return true;
};
