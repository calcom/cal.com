import { z } from "zod";

export const ZGetBookingDetailsInputSchema = z.object({
  bookingId: z.number(),
});

export type TGetBookingDetailsInputSchema = z.infer<typeof ZGetBookingDetailsInputSchema>;
