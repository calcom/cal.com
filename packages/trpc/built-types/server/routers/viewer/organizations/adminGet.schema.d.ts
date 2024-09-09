import { z } from "zod";
export declare const ZAdminGet: z.ZodObject<{
    id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: number;
}>;
export type TAdminGet = z.infer<typeof ZAdminGet>;
