import { z } from "zod";
export declare const ZSubmitFeedbackInputSchema: z.ZodObject<{
    rating: z.ZodString;
    comment: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rating: string;
    comment: string;
}, {
    rating: string;
    comment: string;
}>;
export type TSubmitFeedbackInputSchema = z.infer<typeof ZSubmitFeedbackInputSchema>;
