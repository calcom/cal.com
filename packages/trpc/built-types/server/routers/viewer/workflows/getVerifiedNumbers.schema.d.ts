import { z } from "zod";
export declare const ZGetVerifiedNumbersInputSchema: z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teamId?: number | undefined;
}, {
    teamId?: number | undefined;
}>;
export type TGetVerifiedNumbersInputSchema = z.infer<typeof ZGetVerifiedNumbersInputSchema>;
