import { z } from "zod";
export declare const ZToggleInputSchema: z.ZodObject<{
    slug: z.ZodString;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    slug: string;
    enabled: boolean;
}, {
    slug: string;
    enabled: boolean;
}>;
export type TToggleInputSchema = z.infer<typeof ZToggleInputSchema>;
