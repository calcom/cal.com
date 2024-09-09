import { z } from "zod";
export declare const ZSamlTenantProductInputSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type TSamlTenantProductInputSchema = z.infer<typeof ZSamlTenantProductInputSchema>;
