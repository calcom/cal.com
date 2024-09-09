import { z } from "zod";
export declare const ZOutOfOfficeInputSchema: z.ZodObject<{
    uuid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateRange: z.ZodObject<{
        startDate: z.ZodDate;
        endDate: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        startDate: Date;
        endDate: Date;
    }, {
        startDate: Date;
        endDate: Date;
    }>;
    offset: z.ZodNumber;
    toTeamUserId: z.ZodNullable<z.ZodNumber>;
    reasonId: z.ZodNumber;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    dateRange: {
        startDate: Date;
        endDate: Date;
    };
    offset: number;
    toTeamUserId: number | null;
    reasonId: number;
    uuid?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    dateRange: {
        startDate: Date;
        endDate: Date;
    };
    offset: number;
    toTeamUserId: number | null;
    reasonId: number;
    uuid?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export type TOutOfOfficeInputSchema = z.infer<typeof ZOutOfOfficeInputSchema>;
export declare const ZOutOfOfficeDelete: z.ZodObject<{
    outOfOfficeUid: z.ZodString;
}, "strip", z.ZodTypeAny, {
    outOfOfficeUid: string;
}, {
    outOfOfficeUid: string;
}>;
export type TOutOfOfficeDelete = z.infer<typeof ZOutOfOfficeDelete>;
