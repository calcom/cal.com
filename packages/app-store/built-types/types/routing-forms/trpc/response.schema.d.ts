import { z } from "zod";
export declare const ZResponseInputSchema: z.ZodObject<{
    formId: z.ZodString;
    formFillerId: z.ZodString;
    response: z.ZodRecord<z.ZodString, z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>;
    }, "strip", z.ZodTypeAny, {
        value: (string | number | string[]) & (string | number | string[] | undefined);
        label: string;
    }, {
        value: (string | number | string[]) & (string | number | string[] | undefined);
        label: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    formFillerId: string;
    formId: string;
    response: Record<string, {
        value: (string | number | string[]) & (string | number | string[] | undefined);
        label: string;
    }>;
}, {
    formFillerId: string;
    formId: string;
    response: Record<string, {
        value: (string | number | string[]) & (string | number | string[] | undefined);
        label: string;
    }>;
}>;
export type TResponseInputSchema = z.infer<typeof ZResponseInputSchema>;
//# sourceMappingURL=response.schema.d.ts.map