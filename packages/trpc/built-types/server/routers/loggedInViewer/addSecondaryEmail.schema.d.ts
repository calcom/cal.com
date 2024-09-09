import { z } from "zod";
export declare const ZAddSecondaryEmailInputSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type TAddSecondaryEmailInputSchema = z.infer<typeof ZAddSecondaryEmailInputSchema>;
