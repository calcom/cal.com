import z from "zod";
export declare const albyCredentialKeysSchema: z.ZodObject<{
    account_id: z.ZodString;
    account_email: z.ZodString;
    account_lightning_address: z.ZodString;
    webhook_endpoint_id: z.ZodString;
    webhook_endpoint_secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    account_id: string;
    account_email: string;
    account_lightning_address: string;
    webhook_endpoint_id: string;
    webhook_endpoint_secret: string;
}, {
    account_id: string;
    account_email: string;
    account_lightning_address: string;
    webhook_endpoint_id: string;
    webhook_endpoint_secret: string;
}>;
//# sourceMappingURL=albyCredentialKeysSchema.d.ts.map