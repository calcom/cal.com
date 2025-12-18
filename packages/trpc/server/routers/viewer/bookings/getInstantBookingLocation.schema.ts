import { z } from "zod";

export type TInstantBookingInputSchema = {
  bookingId: number;
};

export const ZInstantBookingInputSchema: z.ZodType<TInstantBookingInputSchema> = z.object({
  bookingId: z.number(),
});
