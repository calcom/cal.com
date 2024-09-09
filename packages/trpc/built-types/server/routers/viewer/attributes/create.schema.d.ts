import { z } from "zod";
export declare const createAttributeSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]>;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
    }, {
        value: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    options: {
        value: string;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    name: string;
}, {
    options: {
        value: string;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    name: string;
}>;
export type ZCreateAttributeSchema = z.infer<typeof createAttributeSchema>;
