import { z } from "zod";

export type TSubmitRatingInputSchema = {
  bookingUid: string;
  rating: number;
  comment?: string;
};

export const ZSubmitRatingInputSchema: z.ZodType<TSubmitRatingInputSchema> = z.object({
  bookingUid: z.string(),
  rating: z.number(),
  comment: z.string().optional(),
});
