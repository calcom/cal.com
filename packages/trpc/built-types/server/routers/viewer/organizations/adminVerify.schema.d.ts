import { z } from "zod";
export declare const ZAdminVerifyInput: z.ZodObject<{
    orgId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    orgId: number;
}, {
    orgId: number;
}>;
export type TAdminVerifyInput = z.infer<typeof ZAdminVerifyInput>;
