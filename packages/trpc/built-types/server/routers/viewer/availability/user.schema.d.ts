import { z } from "zod";
export declare const ZUserInputSchema: z.ZodObject<{
    username: z.ZodString;
    dateFrom: z.ZodString;
    dateTo: z.ZodString;
    eventTypeId: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, number, string>, z.ZodNumber]>>;
    withSource: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    username: string;
    dateFrom: string;
    dateTo: string;
    eventTypeId?: number | undefined;
    withSource?: boolean | undefined;
}, {
    username: string;
    dateFrom: string;
    dateTo: string;
    eventTypeId?: string | number | undefined;
    withSource?: boolean | undefined;
}>;
export type TUserInputSchema = z.infer<typeof ZUserInputSchema>;
