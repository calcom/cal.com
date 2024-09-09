import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
}, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{
    client_id: z.ZodString;
    client_secret: z.ZodString;
    user_agent: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    client_secret: string;
    user_agent: string;
}, {
    client_id: string;
    client_secret: string;
    user_agent: string;
}>;
//# sourceMappingURL=zod.d.ts.map