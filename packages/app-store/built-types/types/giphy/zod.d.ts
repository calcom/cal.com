import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    thankYouPage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    thankYouPage?: string | undefined;
}, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    thankYouPage?: string | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{
    app_key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    app_key: string;
}, {
    app_key: string;
}>;
//# sourceMappingURL=zod.d.ts.map