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
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    price: z.ZodNumber;
    currency: z.ZodString;
    paymentOption: z.ZodOptional<z.ZodString>;
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
export declare const appKeysSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map