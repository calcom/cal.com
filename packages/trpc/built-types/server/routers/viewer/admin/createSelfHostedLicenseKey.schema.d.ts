import { z } from "zod";
export declare const ZCreateSelfHostedLicenseSchema: z.ZodObject<{
    billingType: z.ZodEnum<["PER_BOOKING", "PER_USER"]>;
    entityCount: z.ZodNumber;
    entityPrice: z.ZodNumber;
    billingPeriod: z.ZodEnum<["MONTHLY", "ANNUALLY"]>;
    overages: z.ZodNumber;
    billingEmail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    billingPeriod: "MONTHLY" | "ANNUALLY";
    billingType: "PER_BOOKING" | "PER_USER";
    entityCount: number;
    entityPrice: number;
    overages: number;
    billingEmail: string;
}, {
    billingPeriod: "MONTHLY" | "ANNUALLY";
    billingType: "PER_BOOKING" | "PER_USER";
    entityCount: number;
    entityPrice: number;
    overages: number;
    billingEmail: string;
}>;
export type TCreateSelfHostedLicenseSchema = z.infer<typeof ZCreateSelfHostedLicenseSchema>;
