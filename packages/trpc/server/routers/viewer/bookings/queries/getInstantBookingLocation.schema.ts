import { z } from "zod";

export const ZInstantBookingInputSchema = z.object({
  bookingId: z.number(),
});

export type TInstantBookingInputSchema = z.infer<typeof ZInstantBookingInputSchema>;
