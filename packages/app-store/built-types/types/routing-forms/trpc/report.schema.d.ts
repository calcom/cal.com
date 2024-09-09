import z from "zod";
export declare const ZReportInputSchema: z.ZodObject<{
    formId: z.ZodString;
    jsonLogicQuery: z.ZodObject<{
        logic: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        logic: Record<string, any> | null;
    }, {
        logic: Record<string, any> | null;
    }>;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    formId: string;
    jsonLogicQuery: {
        logic: Record<string, any> | null;
    };
    cursor?: number | null | undefined;
}, {
    formId: string;
    jsonLogicQuery: {
        logic: Record<string, any> | null;
    };
    cursor?: number | null | undefined;
}>;
export type TReportInputSchema = z.infer<typeof ZReportInputSchema>;
//# sourceMappingURL=report.schema.d.ts.map