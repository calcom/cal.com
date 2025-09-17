import type Stripe from "stripe";
import { z } from "zod";

import logger from "@calcom/lib/logger";
import type { PriceCalculationResult } from "@calcom/lib/pricing/types";
import type { EventType, Payment } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["stripepayment:variablePricing"] });

/**
 * Schema for storing variable pricing information in Stripe metadata
 */
export const stripePricingMetadataSchema = z.object({
  basePrice: z.number(),
  calculatedPrice: z.number(),
  currency: z.string(),
  hasRules: z.boolean(),
  ruleTypes: z.array(z.string()).optional(),
  eventTypeId: z.number(),
});

export type StripePricingMetadata = z.infer<typeof stripePricingMetadataSchema>;

/**
 * Maps a pricing calculation result to Stripe product price params
 */
export function mapCalculationToStripePrice(
  calculation: PriceCalculationResult,
  eventTypeId: number,
  options: {
    productId?: string;
    recurring?: boolean;
  } = {}
): Stripe.PriceCreateParams {
  const { totalPrice, currency, breakdown } = calculation;
  const hasRules = breakdown.length > 1; // More than just base price
  const ruleTypes = hasRules
    ? Array.from(new Set(breakdown.filter((item) => item.ruleId).map((item) => item.description)))
    : [];

  return {
    currency: currency.toLowerCase(),
    unit_amount: totalPrice,
    product_data: {
      name: hasRules
        ? `Variable priced booking (${currency.toUpperCase()} ${(totalPrice / 100).toFixed(2)})`
        : `Booking (${currency.toUpperCase()} ${(totalPrice / 100).toFixed(2)})`,
      metadata: {
        basePrice: calculation.basePrice.toString(),
        calculatedPrice: totalPrice.toString(),
        currency: currency,
        hasRules: hasRules.toString(),
        ruleTypes: ruleTypes.join(","),
        eventTypeId: eventTypeId.toString(),
      },
    },
    ...(options.recurring ? { recurring: { interval: "month" } } : {}),
  };
}

/**
 * Generate a unique price ID for caching
 */
export function generatePriceId(calculation: PriceCalculationResult, eventTypeId: number): string {
  return `price_${eventTypeId}_${calculation.totalPrice}_${calculation.currency}`;
}

/**
 * Get or create a Stripe price for variable pricing
 */
export async function getOrCreateStripePrice(
  stripe: Stripe,
  stripeAccountId: string,
  calculation: PriceCalculationResult,
  eventTypeId: number,
  options: {
    productId?: string;
    recurring?: boolean;
    cacheKey?: string;
  } = {}
): Promise<string> {
  try {
    // First, try to find existing price with same parameters
    const priceParams = mapCalculationToStripePrice(calculation, eventTypeId, options);
    const _cacheKey = options.cacheKey || generatePriceId(calculation, eventTypeId);

    // TODO: Implement caching logic here once we have a proper caching mechanism
    // For now, we'll create a new price each time

    // Create a new price
    const price = await stripe.prices.create(priceParams, {
      stripeAccount: stripeAccountId,
    });

    log.debug(`Created new Stripe price: ${price.id}`, { price });
    return price.id;
  } catch (error) {
    log.error("Failed to create Stripe price for variable pricing", { error });
    throw error;
  }
}

/**
 * Generate payment metadata with variable pricing information
 */
export function generatePaymentMetadata(
  calculation: PriceCalculationResult,
  eventType: EventType,
  options: {
    bookingId?: number;
  } = {}
): Record<string, string> {
  return {
    eventTypeId: eventType.id.toString(),
    basePrice: calculation.basePrice.toString(),
    calculatedPrice: calculation.totalPrice.toString(),
    currency: calculation.currency,
    hasVariablePricing: "true",
    ruleCount: calculation.modifiers.length.toString(),
    ...(options.bookingId ? { bookingId: options.bookingId.toString() } : {}),
  };
}

/**
 * Extract variable pricing information from payment
 */
export function extractPricingInfoFromPayment(payment: Payment): {
  basePrice: number;
  calculatedPrice: number;
  currency: string;
  hasVariablePricing: boolean;
} {
  const metadata = payment.metadata as Record<string, string> | null;

  if (!metadata || !metadata.hasVariablePricing) {
    return {
      basePrice: payment.amount,
      calculatedPrice: payment.amount,
      currency: payment.currency,
      hasVariablePricing: false,
    };
  }

  return {
    basePrice: parseInt(metadata.basePrice || payment.amount.toString(), 10),
    calculatedPrice: parseInt(metadata.calculatedPrice || payment.amount.toString(), 10),
    currency: metadata.currency || payment.currency,
    hasVariablePricing: true,
  };
}
