import type { NextApiResponse } from "next";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import stripe from "@calcom/app-store/stripepayment/lib/server";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import type { CalPromotionData } from "@calcom/lib/payment/promoCode";
import { parseCalPromotionData } from "@calcom/lib/payment/promoCode";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { defaultResponder, type TracedRequest } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const CONFIRM_FREE_RATE_LIMIT = 5;
const CONFIRM_FREE_RATE_LIMIT_WINDOW = "60s" as const;

function safeJsonObject(value: unknown): Prisma.JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Prisma.JsonObject;
}

function hasStringProp<T extends string>(x: unknown, key: T): x is { [K in T]: string } {
  return !!x && typeof x === "object" && key in x && typeof (x as Record<string, unknown>)[key] === "string";
}

function getStripeAccountFromPaymentData(paymentData: unknown): string {
  if (hasStringProp(paymentData, "stripeAccount")) return paymentData.stripeAccount;
  throw new HttpError({
    statusCode: 400,
    message: "Stripe account not found on payment",
    data: { code: "stripe_account_missing" },
  });
}

function getExistingPromotion(data: Prisma.JsonObject): CalPromotionData | null {
  return parseCalPromotionData(data["calPromotion"]);
}

const schema = z.object({
  paymentUid: z.string().min(1),
  email: z.string().email(),
});

async function confirmFreePayment(input: z.infer<typeof schema>) {
  const { paymentUid, email } = input;

  const payment = await prisma.payment.findUnique({
    where: { uid: paymentUid },
    select: {
      id: true,
      uid: true,
      appId: true,
      amount: true,
      currency: true,
      success: true,
      refunded: true,
      paymentOption: true,
      externalId: true,
      bookingId: true,
      data: true,
      booking: {
        select: {
          attendees: { select: { email: true } },
          eventType: { select: { metadata: true } },
        },
      },
    },
  });

  if (!payment || !payment.bookingId || !payment.booking) {
    throw new HttpError({ statusCode: 404, message: "Payment not found", data: { code: "not_found" } });
  }
  if (payment.appId !== "stripe") {
    throw new HttpError({ statusCode: 400, message: "Payment is not Stripe", data: { code: "not_stripe" } });
  }
  if (payment.paymentOption !== "ON_BOOKING") {
    throw new HttpError({
      statusCode: 400,
      message: "Free confirmation is only supported for on-booking payments",
      data: { code: "unsupported_payment_option" },
    });
  }
  if (payment.success) {
    return { ok: true };
  }
  if (payment.refunded) {
    throw new HttpError({ statusCode: 400, message: "Payment is refunded", data: { code: "not_eligible" } });
  }
  if (!payment.externalId) {
    throw new HttpError({
      statusCode: 400,
      message: "Payment externalId missing",
      data: { code: "payment_external_id_missing" },
    });
  }

  const emailMatches = payment.booking.attendees.some(
    (a) => (a.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (!emailMatches) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized", data: { code: "unauthorized" } });
  }

  const eventTypeMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(payment.booking.eventType?.metadata);
  const allowPromotionCodes = eventTypeMetadata?.apps?.stripe?.allowPromotionCodes === true;
  if (!allowPromotionCodes) {
    throw new HttpError({
      statusCode: 403,
      message: "Promo codes are not enabled",
      data: { code: "not_enabled" },
    });
  }

  const paymentData = safeJsonObject(payment.data);
  const stripeAccount = getStripeAccountFromPaymentData(paymentData);

  const promotion = getExistingPromotion(paymentData);
  if (!promotion || promotion.finalAmount !== 0) {
    throw new HttpError({ statusCode: 400, message: "Payment is not free", data: { code: "not_free" } });
  }
  if (payment.amount !== 0) {
    throw new HttpError({ statusCode: 400, message: "Payment is not free", data: { code: "not_free" } });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(payment.externalId, { stripeAccount });
  if (paymentIntent.status === "succeeded") {
    throw new HttpError({
      statusCode: 400,
      message: "Payment already succeeded",
      data: { code: "not_eligible" },
    });
  }

  if (paymentIntent.status !== "canceled") {
    await stripe.paymentIntents.update(
      payment.externalId,
      {
        metadata: {
          calPromotionCode: promotion.code,
          calPromotionCodeId: promotion.promotionCodeId,
          calPromotionFinalAmount: "0",
        },
      },
      { stripeAccount }
    );

    await stripe.paymentIntents.cancel(
      payment.externalId,
      {
        cancellation_reason: "requested_by_customer",
      },
      { stripeAccount }
    );
  }

  try {
    await handlePaymentSuccess(payment.id, payment.bookingId);
  } catch (err) {
    if (err instanceof HttpError && err.statusCode === 200) {
      return { ok: true };
    }
    throw err;
  }

  return { ok: true };
}

async function handler(req: TracedRequest, _res: NextApiResponse) {
  if (req.method !== "POST") {
    throw new HttpError({ statusCode: 405, message: "Method Not Allowed" });
  }

  const userIp = getIP(req);
  const identifierBase = hasStringProp(req.body, "paymentUid") ? req.body.paymentUid : "unknown";
  try {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `paymentConfirmFree:${piiHasher.hash(`${identifierBase}:${userIp}`)}`,
      opts: {
        limit: {
          limit: CONFIRM_FREE_RATE_LIMIT,
          duration: CONFIRM_FREE_RATE_LIMIT_WINDOW,
        },
      },
    });
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 429) {
      throw new HttpError({ statusCode: 429, message: error.message, data: { code: "rate_limited" } });
    }
    throw error;
  }

  const input = schema.parse(req.body);
  return await confirmFreePayment(input);
}

export default defaultResponder(handler, "/api/payment/confirm-free");
