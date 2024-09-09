import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
}, {
    teamId: number;
}>;
export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
