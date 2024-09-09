import { z } from "zod";
export declare const ZVerifyPasswordInputSchema: z.ZodObject<{
    passwordInput: z.ZodString;
}, "strip", z.ZodTypeAny, {
    passwordInput: string;
}, {
    passwordInput: string;
}>;
export type TVerifyPasswordInputSchema = z.infer<typeof ZVerifyPasswordInputSchema>;
