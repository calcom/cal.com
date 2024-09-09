import { z } from "zod";
export declare const assignUserToAttributeSchema: z.ZodObject<{
    userId: z.ZodNumber;
    attributes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodOptional<z.ZodString>;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label?: string | undefined;
        }, {
            value: string;
            label?: string | undefined;
        }>, "many">>;
        value: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        options?: {
            value: string;
            label?: string | undefined;
        }[] | undefined;
        value?: string | undefined;
    }, {
        id: string;
        options?: {
            value: string;
            label?: string | undefined;
        }[] | undefined;
        value?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    userId: number;
    attributes: {
        id: string;
        options?: {
            value: string;
            label?: string | undefined;
        }[] | undefined;
        value?: string | undefined;
    }[];
}, {
    userId: number;
    attributes: {
        id: string;
        options?: {
            value: string;
            label?: string | undefined;
        }[] | undefined;
        value?: string | undefined;
    }[];
}>;
export type ZAssignUserToAttribute = z.infer<typeof assignUserToAttributeSchema>;
