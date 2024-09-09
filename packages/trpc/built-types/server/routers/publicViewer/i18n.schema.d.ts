import { z } from "zod";
export declare const i18nInputSchema: z.ZodObject<{
    locale: z.ZodEffects<z.ZodString, string, string>;
    CalComVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    locale: string;
    CalComVersion: string;
}, {
    locale: string;
    CalComVersion: string;
}>;
export type I18nInputSchema = z.infer<typeof i18nInputSchema>;
