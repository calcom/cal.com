import { PaymentType, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import { CalendarEvent } from "@lib/calendarClient";
import { sendAwaitingPaymentEmail, sendOrganizerPaymentRefundFailedEmail } from "@lib/emails/email-manager";
import { getErrorFromUnknown } from "@lib/errors";
import { getInstructor } from "@lib/integrations/Thetis/ThetisApiAdapter";
import prisma from "@lib/prisma";

import { createPaymentLink } from "./client";

export type PaymentInfo = {
  link?: string | null;
  reason?: string | null;
  id?: string | null;
};

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
    users: { thetisId: string }[];
    price: number;
    currency: string;
    description: string;
  },
  booking: {
    user: { email: string | null; name: string | null; timeZone: string } | null;
    id: number;
    startTime: { toISOString: () => string };
    uid: string;
  }
) {
  const paymentFee = Math.round(
    selectedEventType.price * parseFloat(`${paymentFeePercentage}`) + parseInt(`${paymentFeeFixed}`)
  );

  const stripe_publishable_key = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;

  const [user] = selectedEventType.users;
  if (!user) return { notFound: true };

  if (!user.thetisId) return { notFound: true };

  const instructor = await getInstructor(user.thetisId);
  if (!instructor) return { notFound: true };

  const stripeConnectAccountId = instructor.data?.stripeConnectAccountId;
  if (!stripeConnectAccountId) return { notFound: true };

  const params: Stripe.PaymentIntentCreateParams = {
    amount: selectedEventType.price,
    setup_future_usage: "off_session",
    currency: selectedEventType.currency,
    payment_method_types: ["card"],
    application_fee_amount: paymentFee,
    //TODO: add Stripe customer
    description: selectedEventType.description,
    transfer_data: {
      destination: stripeConnectAccountId,
    },
  };

  const paymentIntent = await stripe.paymentIntents.create(params);

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
        stripeAccount: stripeConnectAccountId,
      }) as PaymentData as unknown as Prisma.JsonValue,
      externalId: paymentIntent.id,
    },
  });

  if (process.env.SKILLS_SEND_AWAITING_PAYMENT_EMAIL) {
    await sendAwaitingPaymentEmail({
      ...evt,
      paymentInfo: {
        link: createPaymentLink({
          paymentUid: payment.uid,
          name: booking.user?.name,
          date: booking.startTime.toISOString(),
        }),
      },
    });
  }

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

async function handleRefundError(opts: { event: CalendarEvent; reason: string; paymentId: string }) {
  console.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);
  await sendOrganizerPaymentRefundFailedEmail({
    ...opts.event,
    paymentInfo: { reason: opts.reason, id: opts.paymentId },
  });
}

export default stripe;
