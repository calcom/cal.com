import { z } from "zod";

export const ZGetBookingDetailsInputSchema = z.object({
  uid: z.string(),
});

export type TGetBookingDetailsInputSchema = z.infer<typeof ZGetBookingDetailsInputSchema>;
