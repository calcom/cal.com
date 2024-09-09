import { z } from "zod";
export declare const ZVerifyPhoneNumberInputSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    code: z.ZodString;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    code: string;
    phoneNumber: string;
    teamId?: number | undefined;
}, {
    code: string;
    phoneNumber: string;
    teamId?: number | undefined;
}>;
export type TVerifyPhoneNumberInputSchema = z.infer<typeof ZVerifyPhoneNumberInputSchema>;
