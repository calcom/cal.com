import { z } from "zod";
export declare const googleCredentialSchema: z.ZodObject<{
    scope: z.ZodString;
    token_type: z.ZodLiteral<"Bearer">;
    expiry_date: z.ZodNumber;
    access_token: z.ZodString;
    refresh_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refresh_token: string;
    access_token: string;
    token_type: "Bearer";
    scope: string;
    expiry_date: number;
}, {
    refresh_token: string;
    access_token: string;
    token_type: "Bearer";
    scope: string;
    expiry_date: number;
}>;
//# sourceMappingURL=googleCredentialSchema.d.ts.map