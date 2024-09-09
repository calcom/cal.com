import { z } from "zod";
export declare const ZUpdateOIDCInputSchema: z.ZodObject<{
    teamId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    clientId: z.ZodString;
    clientSecret: z.ZodString;
    wellKnownUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    teamId: number | null;
    clientId: string;
    clientSecret: string;
    wellKnownUrl: string;
}, {
    teamId: number | null;
    clientId: string;
    clientSecret: string;
    wellKnownUrl: string;
}>;
export type TUpdateOIDCInputSchema = z.infer<typeof ZUpdateOIDCInputSchema>;
