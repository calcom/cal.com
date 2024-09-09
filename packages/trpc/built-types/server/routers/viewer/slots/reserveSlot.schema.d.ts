import type { z } from "zod";
export declare const ZReserveSlotInputSchema: z.ZodEffects<z.ZodObject<{
    eventTypeId: z.ZodNumber;
    slotUtcStartDate: z.ZodString;
    slotUtcEndDate: z.ZodString;
    bookingUid: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}>, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}, {
    eventTypeId: number;
    slotUtcStartDate: string;
    slotUtcEndDate: string;
    bookingUid?: string | undefined;
}>;
export type TReserveSlotInputSchema = z.infer<typeof ZReserveSlotInputSchema>;
