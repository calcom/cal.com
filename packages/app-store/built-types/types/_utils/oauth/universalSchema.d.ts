import { z } from "zod";
/**
 * We should be able to work with just the access token.
 * access_token allows us to access the resources
 */
export declare const OAuth2BareMinimumUniversalSchema: z.ZodObject<{
    access_token: z.ZodString;
    /**
     * It is usually 'Bearer'
     */
    token_type: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    access_token: z.ZodString;
    /**
     * It is usually 'Bearer'
     */
    token_type: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    access_token: z.ZodString;
    /**
     * It is usually 'Bearer'
     */
    token_type: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OAuth2UniversalSchema: z.ZodObject<{
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    refresh_token: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    refresh_token: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    refresh_token: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OAuth2UniversalSchemaWithCalcomBackwardCompatibility: z.ZodObject<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OAuth2TokenResponseInDbWhenExistsSchema: z.ZodObject<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const OAuth2TokenResponseInDbSchema: z.ZodNullable<z.ZodObject<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    refresh_token: z.ZodOptional<z.ZodString>;
    access_token: z.ZodString;
    token_type: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodNumber>;
    expires_in: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>>;
//# sourceMappingURL=universalSchema.d.ts.map