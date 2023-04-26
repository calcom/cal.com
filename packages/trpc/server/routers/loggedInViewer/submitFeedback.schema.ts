import { z } from "zod";

export const ZSubmitFeedbackInputSchema = z.object({
  rating: z.string(),
  comment: z.string(),
});

export type TSubmitFeedbackInputSchema = z.infer<typeof ZSubmitFeedbackInputSchema>;
