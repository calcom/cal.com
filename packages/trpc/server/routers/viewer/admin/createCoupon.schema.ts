import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

const DiscountType = z.enum(["percent", "fixed"]);
const CouponDuration = z.enum(["once", "repeating", "forever"]);

export const ZCreateCouponSchema = z
  .object({
    billingEmail: emailSchema,
    discountType: DiscountType,
    discountAmount: z.number().int().min(1),
    currency: z.string().optional().default("USD"),
    duration: CouponDuration,
    durationInMonths: z.number().int().min(1).max(36).optional(),
    code: z.string().min(1),
    couponName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.duration === "repeating") {
        return data.durationInMonths !== undefined;
      }
      return true;
    },
    {
      message: "durationInMonths is required when duration is 'repeating'",
      path: ["durationInMonths"],
    }
  );

export type TCreateCouponSchema = z.infer<typeof ZCreateCouponSchema>;
