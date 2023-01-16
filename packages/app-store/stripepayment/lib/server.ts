import { PaymentType, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";

import { sendAwaitingPaymentEmail, sendOrganizerPaymentRefundFailedEmail } from "@calcom/emails";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { EventTypeModel } from "@calcom/prisma/zod";
import type { CalendarEvent } from "@calcom/types/Calendar";

import appStore from "../../index";
import { createPaymentLink } from "./client";

export type PaymentData = Stripe.Response<Stripe.PaymentIntent> & {
  stripe_publishable_key: string;
  stripeAccount: string;
};

export const stripeOAuthTokenSchema = z.object({
  access_token: z.string().optional(),
  scope: z.string().optional(),
  livemode: z.boolean().optional(),
  token_type: z.literal("bearer").optional(),
  refresh_token: z.string().optional(),
  stripe_user_id: z.string().optional(),
  stripe_publishable_key: z.string().optional(),
});

export const stripeDataSchema = stripeOAuthTokenSchema.extend({
  default_currency: z.string(),
});

export type StripeData = z.infer<typeof stripeDataSchema>;

/** Figure out a way to get this from the DB without too much wreckage. */
const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY!;
const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});

// const stripeKeysSchema = z.object({
//   payment_fee_fixed: z.number(),
//   payment_fee_percentage: z.number(),
// });

// const stripeCredentialSchema = z.object({
//   stripe_user_id: z.string(),
//   stripe_publishable_key: z.string(),
// });

export async function handlePayment(
  evt: CalendarEvent,
  selectedEventType: Pick<z.infer<typeof EventTypeModel>, "price" | "currency" | "metadata">,
  paymentAppCredentials: { key: Prisma.JsonValue },
  booking: {
    user: { email: string | null; name: string | null; timeZone: string } | null;
    id: number;
    startTime: { toISOString: () => string };
    uid: string;
  }
) {
  const paymentType = selectedEventType.metadata?.paymentApp;
  const paymentApp = appStore[paymentType as keyof typeof appStore];

  if (!(paymentApp && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return null;
  }
  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials);
  const paymentData = await paymentInstance.create(
    {
      amount: selectedEventType.price,
      currency: selectedEventType.currency,
    },
    booking.id
  );
  console.log({ paymentData });
  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }

  await sendAwaitingPaymentEmail({
    ...evt,
    paymentInfo: {
      link: createPaymentLink({
        paymentUid: paymentData.uid,
        name: booking.user?.name,
        email: booking.user?.email,
        date: booking.startTime.toISOString(),
      }),
    },
  });

  return paymentData;
}

export async function refund(
  booking: {
    id: number;
    uid: string;
    startTime: Date;
    payment: {
      id: number;
      success: boolean;
      refunded: boolean;
      externalId: string;
      data: Prisma.JsonValue;
      type: PaymentType;
    }[];
  },
  calEvent: CalendarEvent
) {
  try {
    const payment = booking.payment.find((e) => e.success && !e.refunded);
    if (!payment) return;

    if (payment.type !== PaymentType.STRIPE) {
      await handleRefundError({
        event: calEvent,
        reason: "cannot refund non Stripe payment",
        paymentId: "unknown",
      });
      return;
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.externalId,
      },
      { stripeAccount: (payment.data as unknown as PaymentData)["stripeAccount"] }
    );

    if (!refund || refund.status === "failed") {
      await handleRefundError({
        event: calEvent,
        reason: refund?.failure_reason || "unknown",
        paymentId: payment.externalId,
      });
      return;
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        refunded: true,
      },
    });
  } catch (e) {
    const err = getErrorFromUnknown(e);
    console.error(err, "Refund failed");
    await handleRefundError({
      event: calEvent,
      reason: err.message || "unknown",
      paymentId: "unknown",
    });
  }
}

export const closePayments = async (paymentIntentId: string, stripeAccount: string) => {
  try {
    // Expire all current sessions
    const sessions = await stripe.checkout.sessions.list(
      {
        payment_intent: paymentIntentId,
      },
      { stripeAccount }
    );
    for (const session of sessions.data) {
      await stripe.checkout.sessions.expire(session.id, { stripeAccount });
    }
    // Then cancel the payment intent
    await stripe.paymentIntents.cancel(paymentIntentId, { stripeAccount });
    return;
  } catch (e) {
    console.error(e);
    return;
  }
};

async function handleRefundError(opts: { event: CalendarEvent; reason: string; paymentId: string }) {
  console.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);
  await sendOrganizerPaymentRefundFailedEmail({
    ...opts.event,
    paymentInfo: { reason: opts.reason, id: opts.paymentId },
  });
}

export default stripe;
