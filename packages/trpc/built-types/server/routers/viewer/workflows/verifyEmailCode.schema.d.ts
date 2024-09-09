import { z } from "zod";
export declare const ZVerifyEmailCodeInputSchema: z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
    code: z.ZodString;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    email: string;
    teamId?: number | undefined;
}, {
    code: string;
    email: string;
    teamId?: number | undefined;
}>;
export type TVerifyEmailCodeInputSchema = z.infer<typeof ZVerifyEmailCodeInputSchema>;
