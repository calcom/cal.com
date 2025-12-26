import { z } from "zod";

export type TInstantBookingInputSchema = {
  bookingId: number;
};

export const ZInstantBookingInputSchema = z.object({
  bookingId: z.number(),
});
