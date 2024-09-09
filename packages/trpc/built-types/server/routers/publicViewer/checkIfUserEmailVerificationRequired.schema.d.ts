import { z } from "zod";
export declare const ZUserEmailVerificationRequiredSchema: z.ZodObject<{
    userSessionEmail: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    userSessionEmail?: string | undefined;
}, {
    email: string;
    userSessionEmail?: string | undefined;
}>;
export type TUserEmailVerificationRequiredSchema = z.infer<typeof ZUserEmailVerificationRequiredSchema>;
