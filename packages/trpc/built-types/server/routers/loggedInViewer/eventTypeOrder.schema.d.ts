import { z } from "zod";
export declare const ZEventTypeOrderInputSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    ids: number[];
}, {
    ids: number[];
}>;
export type TEventTypeOrderInputSchema = z.infer<typeof ZEventTypeOrderInputSchema>;
