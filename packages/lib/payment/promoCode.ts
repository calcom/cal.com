import { z } from "zod";

export const calPromotionDataSchema = z.object({
  code: z.string(),
  promotionCodeId: z.string(),
  couponId: z.string(),
  originalAmount: z.number(),
  discountAmount: z.number(),
  finalAmount: z.number(),
  percentOff: z.number().nullable().optional(),
  amountOff: z.number().nullable().optional(),
  amountOffCurrency: z.string().nullable().optional(),
});

export type CalPromotionData = z.infer<typeof calPromotionDataSchema>;

export function parseCalPromotionData(input: unknown): CalPromotionData | null {
  const res = calPromotionDataSchema.safeParse(input);
  return res.success ? res.data : null;
}

export function getCalPromotionFromPaymentData(
  paymentData: Record<string, unknown>
): CalPromotionData | null {
  return parseCalPromotionData(paymentData["calPromotion"]);
}

export function getStripePublishableKey(paymentData: Record<string, unknown>): string | undefined {
  const key = paymentData["stripe_publishable_key"];
  return typeof key === "string" ? key : undefined;
}
