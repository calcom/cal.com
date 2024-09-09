import { z } from "zod";
export declare const ZUpdateUserDefaultConferencingAppInputSchema: z.ZodObject<{
    appSlug: z.ZodOptional<z.ZodString>;
    appLink: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    appSlug?: string | undefined;
    appLink?: string | undefined;
}, {
    appSlug?: string | undefined;
    appLink?: string | undefined;
}>;
export type TUpdateUserDefaultConferencingAppInputSchema = z.infer<typeof ZUpdateUserDefaultConferencingAppInputSchema>;
