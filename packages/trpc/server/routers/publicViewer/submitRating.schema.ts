import { z } from "zod";

export const ZSubmitRatingInputSchema = z.object({
  bookingUid: z.string(),
  rating: z.number(),
  comment: z.string().optional(),
});

export type TSubmitRatingInputSchema = z.infer<typeof ZSubmitRatingInputSchema>;
