import { z } from "zod";

export type TSubmitRatingInputSchema = {
  bookingUid: string;
  rating: number;
  comment?: string;
};

export const ZSubmitRatingInputSchema: z.ZodType<TSubmitRatingInputSchema> = z.object({
  bookingUid: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});
