import { z } from "zod";
export declare const ZAppByIdInputSchema: z.ZodObject<{
    appId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    appId: string;
}, {
    appId: string;
}>;
export type TAppByIdInputSchema = z.infer<typeof ZAppByIdInputSchema>;
