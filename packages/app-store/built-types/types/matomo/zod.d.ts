import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    MATOMO_URL: z.ZodOptional<z.ZodString>;
    SITE_ID: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    MATOMO_URL?: string | undefined;
    SITE_ID?: string | undefined;
}, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    MATOMO_URL?: string | undefined;
    SITE_ID?: string | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map