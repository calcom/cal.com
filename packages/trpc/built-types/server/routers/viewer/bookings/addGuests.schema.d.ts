import { z } from "zod";
export declare const ZAddGuestsInputSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
    guests: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
    guests: string[];
}, {
    bookingId: number;
    guests: string[];
}>;
export type TAddGuestsInputSchema = z.infer<typeof ZAddGuestsInputSchema>;
