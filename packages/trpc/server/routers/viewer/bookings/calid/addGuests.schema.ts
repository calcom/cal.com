import { z } from "zod";

export const ZCalIdAddGuestsSchema = z.object({
  bookingId: z.number(),
  guests: z.array(z.string().email()),
});

export type TCalIdAddGuestsSchema = z.infer<typeof ZCalIdAddGuestsSchema>;