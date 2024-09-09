import { z } from "zod";
export declare const editAttributeSchema: z.ZodObject<{
    attributeId: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]>;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        id?: string | undefined;
    }, {
        value: string;
        id?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    options: {
        value: string;
        id?: string | undefined;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    name: string;
    attributeId: string;
}, {
    options: {
        value: string;
        id?: string | undefined;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    name: string;
    attributeId: string;
}>;
export type ZEditAttributeSchema = z.infer<typeof editAttributeSchema>;
