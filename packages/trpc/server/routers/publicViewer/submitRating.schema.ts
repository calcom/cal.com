import { z } from "zod";

export const ZSubmitRatingOptionsSchema = z.object({
  bookingUid: z.string(),
  rating: z.number(),
  comment: z.string().optional(),
});

export type TSubmitRatingOptionsSchema = z.infer<typeof ZSubmitRatingOptionsSchema>;
