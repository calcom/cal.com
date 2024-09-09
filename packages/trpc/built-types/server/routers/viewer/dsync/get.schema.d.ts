import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    organizationId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    organizationId: number | null;
}, {
    organizationId: number | null;
}>;
export type ZGetInputSchema = z.infer<typeof ZGetInputSchema>;
