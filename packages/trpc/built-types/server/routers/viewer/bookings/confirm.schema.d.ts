import type { z } from "zod";
export declare const ZConfirmInputSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
    confirmed: z.ZodBoolean;
    recurringEventId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
    confirmed: boolean;
    recurringEventId?: string | undefined;
    reason?: string | undefined;
}, {
    bookingId: number;
    confirmed: boolean;
    recurringEventId?: string | undefined;
    reason?: string | undefined;
}>;
export type TConfirmInputSchema = z.infer<typeof ZConfirmInputSchema>;
