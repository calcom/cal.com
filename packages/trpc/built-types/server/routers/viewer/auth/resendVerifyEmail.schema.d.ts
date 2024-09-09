import { z } from "zod";
export declare const ZResendVerifyEmailSchema: z.ZodOptional<z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>>;
export type TResendVerifyEmailSchema = z.infer<typeof ZResendVerifyEmailSchema>;
