import { z } from "zod";
export declare const webhookIdAndEventTypeIdSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
}, {
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
}>;
