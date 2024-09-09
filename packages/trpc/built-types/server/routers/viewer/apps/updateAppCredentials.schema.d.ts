import { z } from "zod";
export declare const ZUpdateAppCredentialsInputSchema: z.ZodObject<{
    credentialId: z.ZodNumber;
    key: z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    key: {} & {
        [k: string]: unknown;
    };
    credentialId: number;
}, {
    key: {} & {
        [k: string]: unknown;
    };
    credentialId: number;
}>;
export type TUpdateAppCredentialsInputSchema = z.infer<typeof ZUpdateAppCredentialsInputSchema>;
