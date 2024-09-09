import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    isOrg: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    isOrg?: boolean | undefined;
}, {
    teamId: number;
    isOrg?: boolean | undefined;
}>;
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
