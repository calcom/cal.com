import { z } from "zod";
export declare const ZDeleteCredentialInputSchema: z.ZodObject<{
    id: z.ZodNumber;
    externalId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: number;
    externalId?: string | undefined;
    teamId?: number | undefined;
}, {
    id: number;
    externalId?: string | undefined;
    teamId?: number | undefined;
}>;
export type TDeleteCredentialInputSchema = z.infer<typeof ZDeleteCredentialInputSchema>;
