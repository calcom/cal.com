import { z } from "zod";

export const ZAddGuestsInputSchema = z.object({
  bookingId: z.string(),
  guests: z.array(z.string().email()),
});

export type TAddGuestsInputSchema = z.infer<typeof ZAddGuestsInputSchema>;
