import { z } from "zod";
export declare const ZSendVerificationCodeInputSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phoneNumber: string;
}, {
    phoneNumber: string;
}>;
export type TSendVerificationCodeInputSchema = z.infer<typeof ZSendVerificationCodeInputSchema>;
