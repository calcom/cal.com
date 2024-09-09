import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    scheduleId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    scheduleId: number;
}, {
    scheduleId: number;
}>;
export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
