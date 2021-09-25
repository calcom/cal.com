import { PaymentType } from "@prisma/client";
import Stripe from "stripe";
import { JsonValue } from "type-fest";
import { v4 as uuidv4 } from "uuid";

import { CalendarEvent, Person } from "@lib/calendarClient";
import EventOrganizerRefundFailedMail from "@lib/emails/EventOrganizerRefundFailedMail";
import EventPaymentMail from "@lib/emails/EventPaymentMail";
import prisma from "@lib/prisma";

import { createPaymentLink } from "./client";

export type PaymentData = Stripe.Response<Stripe.PaymentIntent> & {
  stripe_publishable_key: string;
  stripeAccount: string;
};

export type StripeData = Stripe.OAuthToken & {
  default_currency: string;
};

const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY!;
const paymentFeePercentage = process.env.PAYMENT_FEE_PERCENTAGE!;
const paymentFeeFixed = process.env.PAYMENT_FEE_FIXED!;

const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});

export async function handlePayment(
  evt: CalendarEvent,
  selectedEventType: {
    price: number;
    currency: string;
  },
  stripeCredential: { key: JsonValue },
  booking: {
    user: { email: string; name: string; timeZone: string };
    id: number;
    title: string;
    description: string;
    startTime: { toISOString: () => string };
    endTime: { toISOString: () => string };
    attendees: Person[];
    location?: string;
    uid: string;
  }
) {
  const paymentFee = Math.round(
    selectedEventType.price * parseFloat(paymentFeePercentage || "0") + parseInt(paymentFeeFixed || "0")
  );
  const { stripe_user_id, stripe_publishable_key } = stripeCredential.key as Stripe.OAuthToken;

  const params: Stripe.PaymentIntentCreateParams = {
    amount: selectedEventType.price,
    currency: selectedEventType.currency,
    payment_method_types: ["card"],
    application_fee_amount: paymentFee,
  };

  const paymentIntent = await stripe.paymentIntents.create(params, { stripeAccount: stripe_user_id });

  const payment = await prisma.payment.create({
    data: {
      type: PaymentType.STRIPE,
      uid: uuidv4(),
      bookingId: booking.id,
      amount: selectedEventType.price,
      fee: paymentFee,
      currency: selectedEventType.currency,
      success: false,
      refunded: false,
      data: Object.assign({}, paymentIntent, {
        stripe_publishable_key,
        stripeAccount: stripe_user_id,
      }) as PaymentData as unknown as JsonValue,
      externalId: paymentIntent.id,
    },
  });

  const mail = new EventPaymentMail(
    createPaymentLink(payment.uid, booking.user.name, booking.startTime.toISOString()),
    evt,
    booking.uid
  );
  await mail.sendEmail();

  return payment;
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
      data: JsonValue;
      type: PaymentType;
    }[];
  },
  calEvent: CalendarEvent
) {
  try {
    const payment = booking.payment.find((e) => e.success && !e.refunded);
    if (!payment) return;

    if (payment.type != PaymentType.STRIPE) {
      await handleRefundError({
        event: calEvent,
        booking: booking,
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
        booking: booking,
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
    console.error(e, "Refund failed");
    await handleRefundError({
      event: calEvent,
      booking: booking,
      reason: e.message || "unknown",
      paymentId: "unknown",
    });
  }
}

async function handleRefundError(opts: {
  event: CalendarEvent;
  booking: { id: number; uid: string };
  reason: string;
  paymentId: string;
}) {
  console.error(`refund failed: ${opts.reason} for booking '${opts.booking.id}'`);
  try {
    await new EventOrganizerRefundFailedMail(
      opts.event,
      opts.booking.uid,
      opts.reason,
      opts.paymentId
    ).sendEmail();
  } catch (e) {
    console.error("Error while sending refund error email", e);
  }
}

export default stripe;
