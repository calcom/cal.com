import { z } from "zod";
export declare const ZTestTriggerInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    teamId: z.ZodOptional<z.ZodNumber>;
    url: z.ZodString;
    secret: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    payloadTemplate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    url: string;
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
    secret?: string | undefined;
    payloadTemplate?: string | null | undefined;
}, {
    type: string;
    url: string;
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
    secret?: string | undefined;
    payloadTemplate?: string | null | undefined;
}>;
export type TTestTriggerInputSchema = z.infer<typeof ZTestTriggerInputSchema>;
