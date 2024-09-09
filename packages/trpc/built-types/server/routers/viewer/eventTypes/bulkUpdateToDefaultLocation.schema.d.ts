import { z } from "zod";
export declare const ZBulkUpdateToDefaultLocationInputSchema: z.ZodObject<{
    eventTypeIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    eventTypeIds: number[];
}, {
    eventTypeIds: number[];
}>;
export type TBulkUpdateToDefaultLocationInputSchema = z.infer<typeof ZBulkUpdateToDefaultLocationInputSchema>;
