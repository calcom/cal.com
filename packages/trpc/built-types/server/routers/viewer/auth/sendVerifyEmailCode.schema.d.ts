import { z } from "zod";
export declare const ZSendVerifyEmailCodeSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    isVerifyingEmail: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    username?: string | undefined;
    language?: string | undefined;
    isVerifyingEmail?: boolean | undefined;
}, {
    email: string;
    username?: string | undefined;
    language?: string | undefined;
    isVerifyingEmail?: boolean | undefined;
}>;
export type TSendVerifyEmailCodeSchema = z.infer<typeof ZSendVerifyEmailCodeSchema>;
