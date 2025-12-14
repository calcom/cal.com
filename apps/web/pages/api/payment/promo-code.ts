import type { NextApiResponse } from "next";
import type Stripe from "stripe";
import { z } from "zod";

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

const PROMO_CODE_RATE_LIMIT = 5;
const PROMO_CODE_RATE_LIMIT_WINDOW = "60s" as const;

function safeJsonObject(value: unknown): Prisma.JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Prisma.JsonObject;
}

function throwPromoError(code: string, message: string, statusCode = 400): never {
  throw new HttpError({
    statusCode,
    message,
    data: {
      code,
    },
  });
}

function hasStringProp<T extends string>(x: unknown, key: T): x is { [K in T]: string } {
  return !!x && typeof x === "object" && key in x && typeof (x as Record<string, unknown>)[key] === "string";
}

function getStripeAccountFromPaymentData(paymentData: unknown): string {
  if (hasStringProp(paymentData, "stripeAccount")) return paymentData.stripeAccount;
  return throwPromoError("stripe_account_missing", "Stripe account not found on payment");
}

function getExistingPromotion(data: Prisma.JsonObject): CalPromotionData | null {
  return parseCalPromotionData(data["calPromotion"]);
}

async function lockPaymentForPromoCode(tx: Prisma.TransactionClient, paymentId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(paymentId)})`;
}

const applySchema = z.object({
  paymentUid: z.string().min(1),
  promoCode: z.string().trim().min(1),
  email: z.string().email(),
});

const removeSchema = z.object({
  paymentUid: z.string().min(1),
  email: z.string().email(),
});

async function applyPromoCode(args: z.infer<typeof applySchema>) {
  const { paymentUid, promoCode, email } = args;

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
      data: true,
      booking: {
        select: {
          attendees: { select: { email: true } },
          eventType: { select: { metadata: true } },
        },
      },
    },
  });

  if (!payment || !payment.booking) return throwPromoError("not_found", "Payment not found", 404);
  if (payment.appId !== "stripe") return throwPromoError("not_stripe", "Payment is not Stripe");
  if (payment.paymentOption !== "ON_BOOKING") {
    return throwPromoError(
      "unsupported_payment_option",
      "Promo codes are only supported for on-booking payments"
    );
  }
  if (payment.success || payment.refunded) {
    return throwPromoError("not_eligible", "Payment is not eligible for promo codes");
  }
  if (!payment.externalId) {
    return throwPromoError("payment_external_id_missing", "Payment externalId missing");
  }

  const emailMatches = payment.booking.attendees.some(
    (a) => (a.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (!emailMatches) {
    return throwPromoError("unauthorized", "Unauthorized", 401);
  }

  const eventTypeMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(payment.booking.eventType?.metadata);
  const allowPromotionCodes = eventTypeMetadata?.apps?.stripe?.allowPromotionCodes === true;
  if (!allowPromotionCodes) {
    return throwPromoError("not_enabled", "Promo codes are not enabled", 403);
  }

  const paymentData = safeJsonObject(payment.data);
  const stripeAccount = getStripeAccountFromPaymentData(paymentData);

  const existingPromotion = getExistingPromotion(paymentData);
  if (existingPromotion && existingPromotion.code.toLowerCase() === promoCode.toLowerCase()) {
    return {
      payment: { uid: payment.uid, amount: payment.amount, currency: payment.currency },
      promotion: existingPromotion,
    };
  }

  const promoList = await stripe.promotionCodes.list(
    {
      code: promoCode,
      active: true,
      limit: 1,
      expand: ["data.coupon"],
    },
    { stripeAccount }
  );

  const promotionCode = promoList.data[0];
  if (!promotionCode) {
    return throwPromoError("invalid", "Invalid promo code");
  }

  const coupon = promotionCode.coupon as Stripe.Coupon;

  if (!coupon.valid) {
    return throwPromoError("not_active", "Promo code is not active");
  }

  const now = Math.floor(Date.now() / 1000);
  if (coupon.redeem_by && coupon.redeem_by < now) {
    return throwPromoError("expired", "Promo code has expired");
  }

  const baseAmount = existingPromotion?.originalAmount ?? payment.amount;

  let discountAmount = 0;
  let percentOff: number | null = null;
  let amountOff: number | null = null;
  let amountOffCurrency: string | null = null;

  if (typeof coupon.percent_off === "number") {
    percentOff = coupon.percent_off;
    discountAmount = Math.round((baseAmount * coupon.percent_off) / 100);
  } else if (typeof coupon.amount_off === "number") {
    amountOff = coupon.amount_off;
    amountOffCurrency = coupon.currency ?? null;

    if (!coupon.currency || coupon.currency.toLowerCase() !== payment.currency.toLowerCase()) {
      return throwPromoError("currency_mismatch", "Promo code is not applicable to this currency");
    }

    discountAmount = coupon.amount_off;
  } else {
    return throwPromoError("unsupported_coupon", "Unsupported coupon type");
  }

  const finalAmount = Math.max(0, baseAmount - discountAmount);
  if (finalAmount <= 0) {
    return throwPromoError("free_payment", "Promo code would make this payment free");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(payment.externalId, { stripeAccount });
  if (["succeeded", "canceled"].includes(paymentIntent.status)) {
    return throwPromoError("not_eligible", "Payment is not eligible for promo codes");
  }

  const stripeInitialAmount = paymentIntent.amount;
  const stripeInitialPromotionCode =
    typeof paymentIntent.metadata?.calPromotionCode === "string"
      ? paymentIntent.metadata.calPromotionCode
      : "";
  const stripeInitialPromotionCodeId =
    typeof paymentIntent.metadata?.calPromotionCodeId === "string"
      ? paymentIntent.metadata.calPromotionCodeId
      : "";

  return await prisma.$transaction(async (tx) => {
    await lockPaymentForPromoCode(tx, payment.id);

    const lockedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        uid: true,
        amount: true,
        currency: true,
        success: true,
        refunded: true,
        externalId: true,
        data: true,
      },
    });

    if (!lockedPayment) return throwPromoError("not_found", "Payment not found", 404);
    if (lockedPayment.success || lockedPayment.refunded) {
      return throwPromoError("not_eligible", "Payment is not eligible for promo codes");
    }
    if (!lockedPayment.externalId) {
      return throwPromoError("payment_external_id_missing", "Payment externalId missing");
    }

    const lockedPaymentData = safeJsonObject(lockedPayment.data);
    const lockedExistingPromotion = getExistingPromotion(lockedPaymentData);
    if (lockedExistingPromotion && lockedExistingPromotion.code.toLowerCase() === promoCode.toLowerCase()) {
      return {
        payment: { uid: lockedPayment.uid, amount: lockedPayment.amount, currency: lockedPayment.currency },
        promotion: lockedExistingPromotion,
      };
    }

    const lockedBaseAmount = lockedExistingPromotion?.originalAmount ?? lockedPayment.amount;
    const lockedDiscountAmount =
      typeof coupon.percent_off === "number"
        ? Math.round((lockedBaseAmount * coupon.percent_off) / 100)
        : typeof coupon.amount_off === "number"
        ? coupon.amount_off
        : 0;
    const lockedFinalAmount = Math.max(0, lockedBaseAmount - lockedDiscountAmount);
    if (lockedFinalAmount <= 0) {
      return throwPromoError("free_payment", "Promo code would make this payment free");
    }

    const promotion: CalPromotionData = {
      code: promotionCode.code ?? promoCode,
      promotionCodeId: promotionCode.id,
      couponId: coupon.id,
      originalAmount: lockedBaseAmount,
      discountAmount: lockedDiscountAmount,
      finalAmount: lockedFinalAmount,
      percentOff,
      amountOff,
      amountOffCurrency,
    };

    try {
      await stripe.paymentIntents.update(
        lockedPayment.externalId,
        {
          amount: lockedFinalAmount,
          metadata: {
            calPromotionCode: promotionCode.code ?? promoCode,
            calPromotionCodeId: promotionCode.id,
          },
        },
        { stripeAccount }
      );

      await tx.payment.update({
        where: { id: lockedPayment.id },
        data: {
          amount: lockedFinalAmount,
          data: {
            ...lockedPaymentData,
            calPromotion: promotion,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      try {
        await stripe.paymentIntents.update(
          lockedPayment.externalId,
          {
            amount: stripeInitialAmount,
            metadata: {
              calPromotionCode: stripeInitialPromotionCode,
              calPromotionCodeId: stripeInitialPromotionCodeId,
            },
          },
          { stripeAccount }
        );
      } catch {
        // ignore rollback errors
      }
      throw err;
    }

    return {
      payment: { uid: lockedPayment.uid, amount: lockedFinalAmount, currency: lockedPayment.currency },
      promotion,
    };
  });
}

async function removePromoCode(args: z.infer<typeof removeSchema>) {
  const { paymentUid, email } = args;

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
      data: true,
      booking: {
        select: {
          attendees: { select: { email: true } },
          eventType: { select: { metadata: true } },
        },
      },
    },
  });

  if (!payment || !payment.booking) return throwPromoError("not_found", "Payment not found", 404);
  if (payment.appId !== "stripe") return throwPromoError("not_stripe", "Payment is not Stripe");
  if (payment.paymentOption !== "ON_BOOKING") {
    return throwPromoError(
      "unsupported_payment_option",
      "Promo codes are only supported for on-booking payments"
    );
  }
  if (payment.success || payment.refunded) {
    return throwPromoError("not_eligible", "Payment is not eligible for promo codes");
  }
  if (!payment.externalId) {
    return throwPromoError("payment_external_id_missing", "Payment externalId missing");
  }

  const emailMatches = payment.booking.attendees.some(
    (a) => (a.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (!emailMatches) return throwPromoError("unauthorized", "Unauthorized", 401);

  const eventTypeMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(payment.booking.eventType?.metadata);
  const allowPromotionCodes = eventTypeMetadata?.apps?.stripe?.allowPromotionCodes === true;
  if (!allowPromotionCodes) return throwPromoError("not_enabled", "Promo codes are not enabled", 403);

  const paymentData = safeJsonObject(payment.data);
  const stripeAccount = getStripeAccountFromPaymentData(paymentData);

  const existingPromotion = getExistingPromotion(paymentData);
  if (!existingPromotion) {
    return {
      payment: { uid: payment.uid, amount: payment.amount, currency: payment.currency },
      promotion: null,
    };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(payment.externalId, { stripeAccount });
  if (["succeeded", "canceled"].includes(paymentIntent.status)) {
    return throwPromoError("not_eligible", "Payment is not eligible for promo codes");
  }

  const stripeInitialAmount = paymentIntent.amount;
  const stripeInitialPromotionCode =
    typeof paymentIntent.metadata?.calPromotionCode === "string"
      ? paymentIntent.metadata.calPromotionCode
      : "";
  const stripeInitialPromotionCodeId =
    typeof paymentIntent.metadata?.calPromotionCodeId === "string"
      ? paymentIntent.metadata.calPromotionCodeId
      : "";

  return await prisma.$transaction(async (tx) => {
    await lockPaymentForPromoCode(tx, payment.id);

    const lockedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        uid: true,
        amount: true,
        currency: true,
        success: true,
        refunded: true,
        externalId: true,
        data: true,
      },
    });

    if (!lockedPayment) return throwPromoError("not_found", "Payment not found", 404);
    if (lockedPayment.success || lockedPayment.refunded) {
      return throwPromoError("not_eligible", "Payment is not eligible for promo codes");
    }
    if (!lockedPayment.externalId) {
      return throwPromoError("payment_external_id_missing", "Payment externalId missing");
    }

    const lockedPaymentData = safeJsonObject(lockedPayment.data);
    const lockedExistingPromotion = getExistingPromotion(lockedPaymentData);
    if (!lockedExistingPromotion) {
      return {
        payment: { uid: lockedPayment.uid, amount: lockedPayment.amount, currency: lockedPayment.currency },
        promotion: null,
      };
    }

    const { calPromotion: _removed, ...restData } = lockedPaymentData;

    try {
      await stripe.paymentIntents.update(
        lockedPayment.externalId,
        {
          amount: lockedExistingPromotion.originalAmount,
          metadata: {
            calPromotionCode: "",
            calPromotionCodeId: "",
          },
        },
        { stripeAccount }
      );

      await tx.payment.update({
        where: { id: lockedPayment.id },
        data: {
          amount: lockedExistingPromotion.originalAmount,
          data: restData as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      try {
        await stripe.paymentIntents.update(
          lockedPayment.externalId,
          {
            amount: stripeInitialAmount,
            metadata: {
              calPromotionCode: stripeInitialPromotionCode,
              calPromotionCodeId: stripeInitialPromotionCodeId,
            },
          },
          { stripeAccount }
        );
      } catch {
        // ignore rollback errors
      }
      throw err;
    }

    return {
      payment: {
        uid: lockedPayment.uid,
        amount: lockedExistingPromotion.originalAmount,
        currency: lockedPayment.currency,
      },
      promotion: null,
    };
  });
}

async function handler(req: TracedRequest, _res: NextApiResponse) {
  const userIp = getIP(req);

  // rate limit by ip + paymentUid to avoid brute forcing promo codes
  const identifierBase = hasStringProp(req.body, "paymentUid") ? req.body.paymentUid : "unknown";
  try {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `paymentPromoCode:${piiHasher.hash(`${identifierBase}:${userIp}`)}`,
      opts: {
        limit: {
          limit: PROMO_CODE_RATE_LIMIT,
          duration: PROMO_CODE_RATE_LIMIT_WINDOW,
        },
      },
    });
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 429) {
      return throwPromoError("rate_limited", error.message, 429);
    }
    throw error;
  }

  if (req.method === "POST") {
    const input = applySchema.parse(req.body);
    return await applyPromoCode(input);
  }

  if (req.method === "DELETE") {
    const input = removeSchema.parse(req.body);
    return await removePromoCode(input);
  }

  throw new HttpError({ statusCode: 405, message: "Method Not Allowed" });
}

export default defaultResponder(handler, "/api/payment/promo-code");
