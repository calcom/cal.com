import { z } from "zod";
export declare const ZAddClientInputSchema: z.ZodObject<{
    name: z.ZodString;
    redirectUri: z.ZodString;
    logo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    logo: string;
    redirectUri: string;
}, {
    name: string;
    logo: string;
    redirectUri: string;
}>;
export type TAddClientInputSchema = z.infer<typeof ZAddClientInputSchema>;
