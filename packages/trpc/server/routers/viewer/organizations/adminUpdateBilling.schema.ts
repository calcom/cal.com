import { z } from "zod";

export const ZAdminUpdateBilling = z.object({
  id: z.number(),
  seats: z.number().min(1).optional(),
  pricePerSeat: z.number().min(0).optional(),
});

export const ZAdminApplyDiscount = z.object({
  id: z.number(),
  couponCode: z.string().min(1),
});

export const ZAdminCancelSubscription = z.object({
  id: z.number(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

export const ZAdminCreateSubscription = z.object({
  id: z.number(),
  priceId: z.string(),
  quantity: z.number().min(1),
  trialPeriodDays: z.number().min(0).optional(),
});

export const ZAdminCreateDiscount = z.object({
  id: z.number(),
  discountType: z.enum(["percentage", "amount"]),
  discountValue: z.number().min(0),
  durationInMonths: z.number().min(1).max(12).optional(),
  duration: z.enum(["forever", "once", "repeating"]),
  name: z.string().min(1).optional(),
});

export type TAdminUpdateBilling = z.infer<typeof ZAdminUpdateBilling>;
export type TAdminApplyDiscount = z.infer<typeof ZAdminApplyDiscount>;
export type TAdminCancelSubscription = z.infer<typeof ZAdminCancelSubscription>;
export type TAdminCreateSubscription = z.infer<typeof ZAdminCreateSubscription>;
export type TAdminCreateDiscount = z.infer<typeof ZAdminCreateDiscount>;
