import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodEffects<z.ZodString, string, string>;
    logo: z.ZodEffects<z.ZodNullable<z.ZodOptional<z.ZodString>>, string | null, string | null | undefined>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    logo: string | null;
}, {
    name: string;
    slug: string;
    logo?: string | null | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
