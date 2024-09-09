import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    teamId: z.ZodOptional<z.ZodNumber>;
    webhookId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
    webhookId?: string | undefined;
}, {
    id?: string | undefined;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
    webhookId?: string | undefined;
}>;
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
