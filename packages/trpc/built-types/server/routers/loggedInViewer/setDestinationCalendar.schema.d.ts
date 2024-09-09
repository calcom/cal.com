import { z } from "zod";
export declare const ZSetDestinationCalendarInputSchema: z.ZodObject<{
    integration: z.ZodString;
    externalId: z.ZodString;
    eventTypeId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bookingId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    integration: string;
    externalId: string;
    eventTypeId?: number | null | undefined;
    bookingId?: number | null | undefined;
}, {
    integration: string;
    externalId: string;
    eventTypeId?: number | null | undefined;
    bookingId?: number | null | undefined;
}>;
export type TSetDestinationCalendarInputSchema = z.infer<typeof ZSetDestinationCalendarInputSchema>;
