import { z } from "zod";
export declare const ZUpdateInputSchema: z.ZodObject<{
    scheduleId: z.ZodNumber;
    timeZone: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    schedule: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodObject<{
        start: z.ZodDate;
        end: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        end: Date;
        start: Date;
    }, {
        end: Date;
        start: Date;
    }>, "many">, "many">>;
    dateOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
        start: z.ZodDate;
        end: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        end: Date;
        start: Date;
    }, {
        end: Date;
        start: Date;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    scheduleId: number;
    timeZone?: string | undefined;
    name?: string | undefined;
    isDefault?: boolean | undefined;
    schedule?: {
        end: Date;
        start: Date;
    }[][] | undefined;
    dateOverrides?: {
        end: Date;
        start: Date;
    }[] | undefined;
}, {
    scheduleId: number;
    timeZone?: string | undefined;
    name?: string | undefined;
    isDefault?: boolean | undefined;
    schedule?: {
        end: Date;
        start: Date;
    }[][] | undefined;
    dateOverrides?: {
        end: Date;
        start: Date;
    }[] | undefined;
}>;
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
