import { z } from "zod";
export declare const ZUpdateInputSchema: z.ZodObject<{
    encodedRawMetadata: z.ZodString;
    teamId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    teamId: number | null;
    encodedRawMetadata: string;
}, {
    teamId: number | null;
    encodedRawMetadata: string;
}>;
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
