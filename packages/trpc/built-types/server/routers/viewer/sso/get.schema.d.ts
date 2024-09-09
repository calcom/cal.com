import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    teamId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    teamId: number | null;
}, {
    teamId: number | null;
}>;
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
