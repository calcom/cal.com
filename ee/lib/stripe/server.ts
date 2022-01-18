import { PaymentType, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import { sendAwaitingPaymentEmail, sendOrganizerPaymentRefundFailedEmail } from "@lib/emails/email-manager";
import { getErrorFromUnknown } from "@lib/errors";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
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
    price: number;
    currency: string;
  },
  stripeCredential: { key: Prisma.JsonValue },
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
      booking: {
        connect: {
          id: booking.id,
        },
      },
      amount: selectedEventType.price,
      fee: paymentFee,
      currency: selectedEventType.currency,
      success: false,
      refunded: false,
      data: Object.assign({}, paymentIntent, {
        stripe_publishable_key,
        stripeAccount: stripe_user_id,
      }) /* We should treat this */ as PaymentData /* but Prisma doesn't know how to handle it, so it we treat it */ as unknown /* and then */ as Prisma.InputJsonValue,
      externalId: paymentIntent.id,
    },
  });

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

const userType = Prisma.validator<Prisma.UserArgs>()({
  select: {
    email: true,
    metadata: true,
  },
});

type UserType = Prisma.UserGetPayload<typeof userType>;
export async function getStripeCustomerId(user: UserType): Promise<string | null> {
  let customerId: string | null = null;

  if (user?.metadata && typeof user.metadata === "object" && "stripeCustomerId" in user.metadata) {
    customerId = (user?.metadata as Prisma.JsonObject).stripeCustomerId as string;
  } else {
    /* We fallback to finding the customer by email (which is not optimal) */
    const customersReponse = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (customersReponse.data[0]?.id) {
      customerId = customersReponse.data[0].id;
    }
  }

  return customerId;
}

export async function deleteStripeCustomer(user: UserType): Promise<string | null> {
  const customerId = await getStripeCustomerId(user);

  if (!customerId) {
    console.warn("No stripe customer found for user:" + user.email);
    return null;
  }

  //delete stripe customer
  const deletedCustomer = await stripe.customers.del(customerId);

  return deletedCustomer.id;
}

export default stripe;
