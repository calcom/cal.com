import { z } from "zod";
export declare const minimumTokenResponseSchema: z.ZodEffects<z.ZodObject<{
    access_token: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    access_token: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    access_token: z.ZodString;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    access_token: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    access_token: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export type ParseRefreshTokenResponse<S extends z.ZodTypeAny> = z.infer<S> | z.infer<typeof minimumTokenResponseSchema>;
declare const parseRefreshTokenResponse: (response: any, schema: z.ZodTypeAny) => any;
export default parseRefreshTokenResponse;
//# sourceMappingURL=parseRefreshTokenResponse.d.ts.map