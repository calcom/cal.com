import { z } from "zod";
export declare const ZScheduleDuplicateSchema: z.ZodObject<{
    scheduleId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    scheduleId: number;
}, {
    scheduleId: number;
}>;
export type TScheduleDuplicateSchema = z.infer<typeof ZScheduleDuplicateSchema>;
