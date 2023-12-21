import { z } from "zod";

const ZInstantBookingInputSchema = z.object({
  bookingId: z.number(),
});

export type TInstantBookingInputSchema = z.infer<typeof ZInstantBookingInputSchema>;

export { ZInstantBookingInputSchema };
