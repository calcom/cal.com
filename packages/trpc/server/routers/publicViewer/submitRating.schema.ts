import { z } from "zod";

export const ZSubmitRatingInputSchema = z.object({
  rating: z.number(),
  comment: z.string().optional(),
  token: z.string(),
});

export type TSubmitRatingInputSchema = z.infer<typeof ZSubmitRatingInputSchema>;
