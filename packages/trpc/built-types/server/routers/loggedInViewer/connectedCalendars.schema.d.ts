import { z } from "zod";
export declare const ZConnectedCalendarsInputSchema: z.ZodOptional<z.ZodObject<{
    onboarding: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    onboarding?: boolean | undefined;
}, {
    onboarding?: boolean | undefined;
}>>;
export type TConnectedCalendarsInputSchema = z.infer<typeof ZConnectedCalendarsInputSchema>;
