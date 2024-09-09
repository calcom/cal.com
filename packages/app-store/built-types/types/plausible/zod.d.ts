import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    PLAUSIBLE_URL: z.ZodUnion<[z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodUndefined]>;
    trackingId: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    PLAUSIBLE_URL?: string | undefined;
    trackingId?: string | undefined;
}, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    PLAUSIBLE_URL?: string | undefined;
    trackingId?: string | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map