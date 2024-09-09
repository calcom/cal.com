import { z } from "zod";
declare const ZInstantBookingInputSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
}, {
    bookingId: number;
}>;
export type TInstantBookingInputSchema = z.infer<typeof ZInstantBookingInputSchema>;
export { ZInstantBookingInputSchema };
