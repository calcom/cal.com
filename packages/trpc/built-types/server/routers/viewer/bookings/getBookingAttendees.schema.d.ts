import { z } from "zod";
export declare const ZGetBookingAttendeesInputSchema: z.ZodObject<{
    seatReferenceUid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    seatReferenceUid: string;
}, {
    seatReferenceUid: string;
}>;
export type TGetBookingAttendeesInputSchema = z.infer<typeof ZGetBookingAttendeesInputSchema>;
