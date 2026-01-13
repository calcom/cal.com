import { z } from "zod";

export const ZResendPurchaseCompleteEmailSchema = z.object({
  billingEmail: z.string().email(),
});

export type TResendPurchaseCompleteEmailSchema = z.infer<typeof ZResendPurchaseCompleteEmailSchema>;
