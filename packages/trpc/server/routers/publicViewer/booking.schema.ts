import z from "zod";

export const ZBookingInputSchema = z.object({
  bookingUid: z.string(),
});

export type TBookingInputSchema = z.infer<typeof ZBookingInputSchema>;
