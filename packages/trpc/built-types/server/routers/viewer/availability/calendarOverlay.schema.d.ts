import { z } from "zod";
export declare const ZCalendarOverlayInputSchema: z.ZodObject<{
    loggedInUsersTz: z.ZodString;
    dateFrom: z.ZodNullable<z.ZodString>;
    dateTo: z.ZodNullable<z.ZodString>;
    calendarsToLoad: z.ZodArray<z.ZodObject<{
        credentialId: z.ZodNumber;
        externalId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        credentialId: number;
        externalId: string;
    }, {
        credentialId: number;
        externalId: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    dateFrom: string | null;
    dateTo: string | null;
    loggedInUsersTz: string;
    calendarsToLoad: {
        credentialId: number;
        externalId: string;
    }[];
}, {
    dateFrom: string | null;
    dateTo: string | null;
    loggedInUsersTz: string;
    calendarsToLoad: {
        credentialId: number;
        externalId: string;
    }[];
}>;
export type TCalendarOverlayInputSchema = z.infer<typeof ZCalendarOverlayInputSchema>;
