import { z } from "zod";
export declare const ZUpdateInputSchema: z.ZodObject<{
    licenseKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    licenseKey?: string | undefined;
}, {
    licenseKey?: string | undefined;
}>;
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
