import { z } from "zod";
export declare const ZAdminPasswordResetSchema: z.ZodObject<{
    userId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId: number;
}, {
    userId: number;
}>;
export type TAdminPasswordResetSchema = z.infer<typeof ZAdminPasswordResetSchema>;
