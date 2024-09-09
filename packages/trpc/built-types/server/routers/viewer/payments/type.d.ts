import { z } from "zod";
export declare const ChargerCardSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
}, {
    bookingId: number;
}>;
export type TChargeCardSchema = z.infer<typeof ChargerCardSchema>;
