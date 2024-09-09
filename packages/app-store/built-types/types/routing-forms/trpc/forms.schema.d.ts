import { z } from "zod";
export declare const ZFormsInputSchema: z.ZodOptional<z.ZodNullable<z.ZodObject<{
    filters: z.ZodOptional<z.ZodObject<{
        teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        userIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        upIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        upIds?: string[] | undefined;
    }, {
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        upIds?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    filters?: {
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        upIds?: string[] | undefined;
    } | undefined;
}, {
    filters?: {
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        upIds?: string[] | undefined;
    } | undefined;
}>>>;
export type TFormSchema = z.infer<typeof ZFormsInputSchema>;
//# sourceMappingURL=forms.schema.d.ts.map