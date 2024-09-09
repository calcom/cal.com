import { z } from "zod";
export declare const ZBulkUpdateToDefaultAvailabilityInputSchema: z.ZodObject<{
    eventTypeIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    eventTypeIds: number[];
}, {
    eventTypeIds: number[];
}>;
export type TBulkUpdateToDefaultAvailabilityInputSchema = z.infer<typeof ZBulkUpdateToDefaultAvailabilityInputSchema>;
