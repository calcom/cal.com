import { z } from "zod";
export declare const ZFindKeyOfTypeInputSchema: z.ZodObject<{
    appId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    appId?: string | undefined;
    teamId?: number | undefined;
}, {
    appId?: string | undefined;
    teamId?: number | undefined;
}>;
export type TFindKeyOfTypeInputSchema = z.infer<typeof ZFindKeyOfTypeInputSchema>;
