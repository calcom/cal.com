import { z } from "zod";
export declare const ZMarkHostAsNoShowInputSchema: z.ZodObject<{
    bookingUid: z.ZodString;
    noShowHost: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    noShowHost: boolean;
    bookingUid: string;
}, {
    noShowHost: boolean;
    bookingUid: string;
}>;
export type TNoShowInputSchema = z.infer<typeof ZMarkHostAsNoShowInputSchema>;
