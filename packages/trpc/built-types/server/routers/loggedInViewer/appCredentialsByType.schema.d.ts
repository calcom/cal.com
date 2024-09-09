import { z } from "zod";
export declare const ZAppCredentialsByTypeInputSchema: z.ZodObject<{
    appType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    appType: string;
}, {
    appType: string;
}>;
export type TAppCredentialsByTypeInputSchema = z.infer<typeof ZAppCredentialsByTypeInputSchema>;
