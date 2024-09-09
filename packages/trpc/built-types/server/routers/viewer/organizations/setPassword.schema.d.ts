import { z } from "zod";
export declare const ZSetPasswordSchema: z.ZodObject<{
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
}, {
    newPassword: string;
}>;
export type TSetPasswordSchema = z.infer<typeof ZSetPasswordSchema>;
