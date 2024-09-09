import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    scheduleId: z.ZodOptional<z.ZodNumber>;
    isManagedEventType: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    scheduleId?: number | undefined;
    isManagedEventType?: boolean | undefined;
}, {
    scheduleId?: number | undefined;
    isManagedEventType?: boolean | undefined;
}>;
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
