import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    organizationId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    name: z.ZodString;
    provider: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    organizationId: number | null;
    provider: string;
}, {
    name: string;
    organizationId: number | null;
    provider: string;
}>;
export type ZCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
