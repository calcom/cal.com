import { z } from "zod";
export declare const ZAdminRemoveTwoFactor: z.ZodObject<{
    userId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId: number;
}, {
    userId: number;
}>;
export type TAdminRemoveTwoFactor = z.infer<typeof ZAdminRemoveTwoFactor>;
