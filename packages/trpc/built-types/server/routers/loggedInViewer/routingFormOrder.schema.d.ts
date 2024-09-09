import { z } from "zod";
export declare const ZRoutingFormOrderInputSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export type TRoutingFormOrderInputSchema = z.infer<typeof ZRoutingFormOrderInputSchema>;
