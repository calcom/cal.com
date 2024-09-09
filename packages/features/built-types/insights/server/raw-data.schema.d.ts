import z from "zod";
declare const rawDataInputSchema: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
    teamId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    userId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    memberUserId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    isAll: z.ZodOptional<z.ZodBoolean>;
    eventTypeId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    teamId?: number | null | undefined;
    userId?: number | null | undefined;
    memberUserId?: number | null | undefined;
    isAll?: boolean | undefined;
    eventTypeId?: number | null | undefined;
}, {
    startDate: string;
    endDate: string;
    teamId?: number | null | undefined;
    userId?: number | null | undefined;
    memberUserId?: number | null | undefined;
    isAll?: boolean | undefined;
    eventTypeId?: number | null | undefined;
}>;
export type RawDataInput = z.infer<typeof rawDataInputSchema>;
export { rawDataInputSchema };
//# sourceMappingURL=raw-data.schema.d.ts.map