import { z } from "zod";
export declare const ZGetClientInputSchema: z.ZodObject<{
    clientId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    clientId: string;
}, {
    clientId: string;
}>;
export type TGetClientInputSchema = z.infer<typeof ZGetClientInputSchema>;
