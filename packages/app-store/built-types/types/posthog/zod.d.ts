import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    TRACKING_ID: z.ZodOptional<z.ZodString>;
    API_HOST: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    TRACKING_ID?: string | undefined;
    API_HOST?: string | undefined;
}, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    TRACKING_ID?: string | undefined;
    API_HOST?: string | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map