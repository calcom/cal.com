import { z } from "zod";
export declare const ZWorkflowOrderInputSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    ids: number[];
}, {
    ids: number[];
}>;
export type TWorkflowOrderInputSchema = z.infer<typeof ZWorkflowOrderInputSchema>;
