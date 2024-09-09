import { z } from "zod";
export declare const ZRequestRescheduleInputSchema: z.ZodObject<{
    bookingId: z.ZodString;
    rescheduleReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bookingId: string;
    rescheduleReason?: string | undefined;
}, {
    bookingId: string;
    rescheduleReason?: string | undefined;
}>;
export type TRequestRescheduleInputSchema = z.infer<typeof ZRequestRescheduleInputSchema>;
