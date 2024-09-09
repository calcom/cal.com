import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    name: z.ZodString;
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
    eventTypeId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    schedule?: {
        end: Date;
        start: Date;
    }[][] | undefined;
    eventTypeId?: number | undefined;
}, {
    name: string;
    schedule?: {
        end: Date;
        start: Date;
    }[][] | undefined;
    eventTypeId?: number | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
