import { z } from "zod";
export declare const ZGetVerifiedEmailsInputSchema: z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teamId?: number | undefined;
}, {
    teamId?: number | undefined;
}>;
export type TGetVerifiedEmailsInputSchema = z.infer<typeof ZGetVerifiedEmailsInputSchema>;
