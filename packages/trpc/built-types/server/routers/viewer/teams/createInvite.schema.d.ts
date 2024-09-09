import { z } from "zod";
export declare const ZCreateInviteInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    token?: string | undefined;
}, {
    teamId: number;
    token?: string | undefined;
}>;
export type TCreateInviteInputSchema = z.infer<typeof ZCreateInviteInputSchema>;
