import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    teamId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    teamId: number | null;
}, {
    teamId: number | null;
}>;
export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
