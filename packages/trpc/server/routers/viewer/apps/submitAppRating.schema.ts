import { z } from "zod";

export const ZSubmitAppRatingInputSchema = z.object({
  appSlug: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type TSubmitAppRatingInputSchema = z.infer<typeof ZSubmitAppRatingInputSchema>;
