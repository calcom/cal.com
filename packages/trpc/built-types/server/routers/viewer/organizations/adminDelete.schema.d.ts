import { z } from "zod";
export declare const ZAdminDeleteInput: z.ZodObject<{
    orgId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    orgId: number;
}, {
    orgId: number;
}>;
export type TAdminDeleteInput = z.infer<typeof ZAdminDeleteInput>;
