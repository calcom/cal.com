import type { NextApiResponse } from "next";
import type Stripe from "stripe";
import { z } from "zod";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { defaultResponder, type TracedRequest } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

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

type CalPromotionData = {
  code: string;
  promotionCodeId: string;
  couponId: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  percentOff?: number | null;
  amountOff?: number | null;
  amountOffCurrency?: string | null;
};

function getExistingPromotion(data: Prisma.JsonObject): CalPromotionData | null {
  const value = data["calPromotion"];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  if (
    typeof record.code !== "string" ||
    typeof record.promotionCodeId !== "string" ||
    typeof record.couponId !== "string" ||
    typeof record.originalAmount !== "number" ||
    typeof record.discountAmount !== "number" ||
    typeof record.finalAmount !== "number"
  ) {
    return null;
  }

  return {
    code: record.code,
    promotionCodeId: record.promotionCodeId,
    couponId: record.couponId,
    originalAmount: record.originalAmount,
    discountAmount: record.discountAmount,
    finalAmount: record.finalAmount,
    percentOff: typeof record.percentOff === "number" ? record.percentOff : null,
    amountOff: typeof record.amountOff === "number" ? record.amountOff : null,
    amountOffCurrency: typeof record.amountOffCurrency === "string" ? record.amountOffCurrency : null,
  };
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

  await stripe.paymentIntents.update(
    payment.externalId,
    {
      amount: finalAmount,
      metadata: {
        calPromotionCode: promotionCode.code ?? promoCode,
        calPromotionCodeId: promotionCode.id,
      },
    },
    { stripeAccount }
  );

  const promotion: CalPromotionData = {
    code: promotionCode.code ?? promoCode,
    promotionCodeId: promotionCode.id,
    couponId: coupon.id,
    originalAmount: baseAmount,
    discountAmount,
    finalAmount,
    percentOff,
    amountOff,
    amountOffCurrency,
  };

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      amount: finalAmount,
      data: {
        ...paymentData,
        calPromotion: promotion,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    payment: { uid: payment.uid, amount: finalAmount, currency: payment.currency },
    promotion,
  };
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

  await stripe.paymentIntents.update(
    payment.externalId,
    {
      amount: existingPromotion.originalAmount,
      metadata: {
        calPromotionCode: "",
        calPromotionCodeId: "",
      },
    },
    { stripeAccount }
  );

  // remove calPromotion
  const { calPromotion: _removed, ...restData } = paymentData as unknown as Record<string, unknown>;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      amount: existingPromotion.originalAmount,
      data: restData as Prisma.InputJsonValue,
    },
  });

  return {
    payment: { uid: payment.uid, amount: existingPromotion.originalAmount, currency: payment.currency },
    promotion: null,
  };
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
          limit: 5,
          duration: "60s",
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
