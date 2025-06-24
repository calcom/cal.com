import { z } from "zod";

export const ZDeleteBookingInputSchema = z.object({
  id: z.number().int().positive(),
});

export type TDeleteBookingInputSchema = z.infer<typeof ZDeleteBookingInputSchema>;
