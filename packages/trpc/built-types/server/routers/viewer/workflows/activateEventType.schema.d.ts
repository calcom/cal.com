import { z } from "zod";
export declare const ZActivateEventTypeInputSchema: z.ZodObject<{
    eventTypeId: z.ZodNumber;
    workflowId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    eventTypeId: number;
    workflowId: number;
}, {
    eventTypeId: number;
    workflowId: number;
}>;
export type TActivateEventTypeInputSchema = z.infer<typeof ZActivateEventTypeInputSchema>;
