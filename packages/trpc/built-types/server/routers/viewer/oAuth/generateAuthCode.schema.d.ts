import { z } from "zod";
export declare const ZGenerateAuthCodeInputSchema: z.ZodObject<{
    clientId: z.ZodString;
    scopes: z.ZodArray<z.ZodString, "many">;
    teamSlug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    clientId: string;
    scopes: string[];
    teamSlug?: string | undefined;
}, {
    clientId: string;
    scopes: string[];
    teamSlug?: string | undefined;
}>;
export type TGenerateAuthCodeInputSchema = z.infer<typeof ZGenerateAuthCodeInputSchema>;
