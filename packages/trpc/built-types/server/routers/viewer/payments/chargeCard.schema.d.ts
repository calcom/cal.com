import type { z } from "zod";
export declare const ZChargerCardInputSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
}, {
    bookingId: number;
}>;
export type TChargeCardInputSchema = z.infer<typeof ZChargerCardInputSchema>;
