import { z } from "zod";
export declare const ZDeleteMeInputSchema: z.ZodObject<{
    password: z.ZodString;
    totpCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    password: string;
    totpCode?: string | undefined;
}, {
    password: string;
    totpCode?: string | undefined;
}>;
export type TDeleteMeInputSchema = z.infer<typeof ZDeleteMeInputSchema>;
