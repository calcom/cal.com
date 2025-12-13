import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
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
