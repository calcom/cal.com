import { z } from "zod";

export const ChargerCardSchema = z.object({
  bookingId: z.number(),
});

export type TChargeCardSchema = z.infer<typeof ChargerCardSchema>;

export const CompletePaymentSchema = z.object({
  bookingId: z.number(),
});

export type TCompletePaymentSchema = z.infer<typeof CompletePaymentSchema>;

export const SendPaymentLinkSchema = z.object({
  bookingId: z.number(),
  method: z.string(),
});

export type TSendPaymentLinkSchema = z.infer<typeof SendPaymentLinkSchema>;
