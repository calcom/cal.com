import { z } from "zod";
export declare enum BillingPeriod {
    MONTHLY = "MONTHLY",
    ANNUALLY = "ANNUALLY"
}
export declare const ZCreateInputSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodEffects<z.ZodString, string, string>;
    orgOwnerEmail: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
    seats: z.ZodOptional<z.ZodNumber>;
    pricePerSeat: z.ZodOptional<z.ZodNumber>;
    isPlatform: z.ZodDefault<z.ZodBoolean>;
    billingPeriod: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof BillingPeriod>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    isPlatform: boolean;
    orgOwnerEmail: string;
    language?: string | undefined;
    seats?: number | undefined;
    pricePerSeat?: number | undefined;
    billingPeriod?: BillingPeriod | undefined;
}, {
    name: string;
    slug: string;
    orgOwnerEmail: string;
    language?: string | undefined;
    seats?: number | undefined;
    pricePerSeat?: number | undefined;
    isPlatform?: boolean | undefined;
    billingPeriod?: BillingPeriod | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
