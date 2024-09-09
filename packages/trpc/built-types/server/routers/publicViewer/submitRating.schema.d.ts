import { z } from "zod";
export declare const ZSubmitRatingInputSchema: z.ZodObject<{
    bookingUid: z.ZodString;
    rating: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rating: number;
    bookingUid: string;
    comment?: string | undefined;
}, {
    rating: number;
    bookingUid: string;
    comment?: string | undefined;
}>;
export type TSubmitRatingInputSchema = z.infer<typeof ZSubmitRatingInputSchema>;
