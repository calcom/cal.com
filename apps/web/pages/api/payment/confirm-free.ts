import type { NextApiResponse } from "next";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import stripe from "@calcom/app-store/stripepayment/lib/server";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import { getCalPromotionFromPaymentData } from "@calcom/lib/payment/promoCode";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { defaultResponder, type TracedRequest } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import { PaymentOption } from "@calcom/prisma/enums";

import { getStripeAccountFromPaymentData, hasStringProp, lockPaymentById, safeJsonObject } from "./_utils";

const CONFIRM_FREE_RATE_LIMIT = 5;
const CONFIRM_FREE_RATE_LIMIT_WINDOW = "60s" as const;

const schema = z.object({
  paymentUid: z.string().min(1),
  email: z.string().email(),
});

async function confirmFreePayment(input: z.infer<typeof schema>) {
  const { paymentUid, email } = input;

  const locked = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { uid: paymentUid },
      select: {
        id: true,
        uid: true,
        appId: true,
        amount: true,
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

    await lockPaymentById(tx, payment.id);

    const lockedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        uid: true,
        appId: true,
        amount: true,
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

    if (!lockedPayment || !lockedPayment.bookingId || !lockedPayment.booking) {
      throw new HttpError({ statusCode: 404, message: "Payment not found", data: { code: "not_found" } });
    }
    if (lockedPayment.appId !== "stripe") {
      throw new HttpError({
        statusCode: 400,
        message: "Payment is not Stripe",
        data: { code: "not_stripe" },
      });
    }
    if (lockedPayment.paymentOption !== PaymentOption.ON_BOOKING) {
      throw new HttpError({
        statusCode: 400,
        message: "Free confirmation is only supported for on-booking payments",
        data: { code: "unsupported_payment_option" },
      });
    }
    if (lockedPayment.success) {
      return { ok: true as const, alreadyProcessed: true as const };
    }
    if (lockedPayment.refunded) {
      throw new HttpError({
        statusCode: 400,
        message: "Payment is refunded",
        data: { code: "not_eligible" },
      });
    }
    if (!lockedPayment.externalId) {
      throw new HttpError({
        statusCode: 400,
        message: "Payment externalId missing",
        data: { code: "payment_external_id_missing" },
      });
    }

    const emailMatches = lockedPayment.booking.attendees.some(
      (a) => (a.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (!emailMatches) {
      throw new HttpError({ statusCode: 401, message: "Unauthorized", data: { code: "unauthorized" } });
    }

    const eventTypeMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(
      lockedPayment.booking.eventType?.metadata
    );
    const allowPromotionCodes = eventTypeMetadata?.apps?.stripe?.allowPromotionCodes === true;
    if (!allowPromotionCodes) {
      throw new HttpError({
        statusCode: 403,
        message: "Promo codes are not enabled",
        data: { code: "not_enabled" },
      });
    }

    const paymentData = safeJsonObject(lockedPayment.data);
    const stripeAccount = getStripeAccountFromPaymentData(paymentData);

    const promotion = getCalPromotionFromPaymentData(paymentData);
    if (!promotion || promotion.finalAmount !== 0) {
      throw new HttpError({ statusCode: 400, message: "Payment is not free", data: { code: "not_free" } });
    }
    if (lockedPayment.amount !== 0) {
      throw new HttpError({ statusCode: 400, message: "Payment is not free", data: { code: "not_free" } });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(lockedPayment.externalId, { stripeAccount });
    if (paymentIntent.status === "succeeded") {
      throw new HttpError({
        statusCode: 400,
        message: "Payment already succeeded",
        data: { code: "not_eligible" },
      });
    }

    if (paymentIntent.status !== "canceled") {
      await stripe.paymentIntents.update(
        lockedPayment.externalId,
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
        lockedPayment.externalId,
        {
          cancellation_reason: "requested_by_customer",
        },
        { stripeAccount }
      );
    }

    // Make the operation idempotent for concurrent requests.
    await tx.payment.update({
      where: { id: lockedPayment.id },
      data: { success: true },
    });
    await tx.booking.update({
      where: { id: lockedPayment.bookingId },
      data: { paid: true },
    });

    return {
      ok: true as const,
      alreadyProcessed: false as const,
      paymentId: lockedPayment.id,
      bookingId: lockedPayment.bookingId,
    };
  });

  if (locked.alreadyProcessed) return { ok: true };

  try {
    await handlePaymentSuccess(locked.paymentId, locked.bookingId);
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
