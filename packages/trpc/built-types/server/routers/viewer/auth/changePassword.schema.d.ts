import { z } from "zod";
export declare const ZChangePasswordInputSchema: z.ZodObject<{
    oldPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    oldPassword: string;
    newPassword: string;
}, {
    oldPassword: string;
    newPassword: string;
}>;
export type TChangePasswordInputSchema = z.infer<typeof ZChangePasswordInputSchema>;
