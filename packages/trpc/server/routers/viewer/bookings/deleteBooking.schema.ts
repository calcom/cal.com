import { z } from "zod";

export const ZDeleteBookingInputSchema = z.object({
  id: z.number(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteBookingInputSchema>;
