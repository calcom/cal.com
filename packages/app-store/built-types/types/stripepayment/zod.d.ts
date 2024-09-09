import { z } from "zod";
export declare const paymentOptionEnum: z.ZodEnum<[string, ...string[]]>;
export declare const appDataSchema: z.ZodObject<{
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    price: z.ZodNumber;
    currency: z.ZodString;
    paymentOption: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    price: number;
    currency: string;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    paymentOption?: string | undefined;
    enabled?: boolean | undefined;
}, {
    price: number;
    currency: string;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    paymentOption?: string | undefined;
    enabled?: boolean | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{
    client_id: z.ZodString;
    client_secret: z.ZodString;
    public_key: z.ZodString;
    webhook_secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    client_secret: string;
    public_key: string;
    webhook_secret: string;
}, {
    client_id: string;
    client_secret: string;
    public_key: string;
    webhook_secret: string;
}>;
//# sourceMappingURL=zod.d.ts.map