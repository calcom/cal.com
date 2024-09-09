import { z } from "zod";
export declare const ZEditLocationInputSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
    newLocation: z.ZodEffects<z.ZodString, string, string>;
    details: z.ZodOptional<z.ZodObject<{
        credentialId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        credentialId?: number | undefined;
    }, {
        credentialId?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
    newLocation: string;
    details?: {
        credentialId?: number | undefined;
    } | undefined;
}, {
    bookingId: number;
    newLocation: string;
    details?: {
        credentialId?: number | undefined;
    } | undefined;
}>;
export type TEditLocationInputSchema = z.infer<typeof ZEditLocationInputSchema>;
