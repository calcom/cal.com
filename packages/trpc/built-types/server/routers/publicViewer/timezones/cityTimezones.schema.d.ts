import { z } from "zod";
export declare const cityTimezonesSchema: z.ZodObject<{
    CalComVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    CalComVersion: string;
}, {
    CalComVersion: string;
}>;
export type CityTimezonesSchema = z.infer<typeof cityTimezonesSchema>;
