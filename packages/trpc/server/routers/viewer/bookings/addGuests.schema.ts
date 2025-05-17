import { z } from "zod";

export const ZAddGuestsInputSchema = z.object({
  bookingId: z.number(),
  guests: z.array(z.email()),
});

export type TAddGuestsInputSchema = z.infer<typeof ZAddGuestsInputSchema>;
