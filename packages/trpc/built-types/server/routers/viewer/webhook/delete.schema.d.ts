import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    id: z.ZodString;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
}, {
    id: string;
    eventTypeId?: number | undefined;
    teamId?: number | undefined;
}>;
export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
