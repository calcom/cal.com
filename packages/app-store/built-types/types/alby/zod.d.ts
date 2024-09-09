import { z } from "zod";
export declare const paymentOptionsSchema: z.ZodArray<z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    label: string;
}, {
    value: string;
    label: string;
}>, "many">;
export declare const PaypalPaymentOptions: {
    label: string;
    value: string;
}[];
export declare const paymentOptionEnum: z.ZodEnum<[string, ...string[]]>;
export declare const appDataSchema: z.ZodObject<{
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    price: z.ZodNumber;
    currency: z.ZodString;
    paymentOption: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    price: number;
    currency: string;
    appCategories?: string[] | undefined;
    paymentOption?: string | undefined;
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
}, {
    price: number;
    currency: string;
    appCategories?: string[] | undefined;
    paymentOption?: string | undefined;
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{
    client_id: z.ZodString;
    client_secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    client_secret: string;
}, {
    client_id: string;
    client_secret: string;
}>;
//# sourceMappingURL=zod.d.ts.map