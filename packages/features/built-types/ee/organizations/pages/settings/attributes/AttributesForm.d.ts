import React from "react";
import { z } from "zod";
declare const AttributeSchema: z.ZodObject<{
    attrName: z.ZodString;
    type: z.ZodEnum<["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]>;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        id: z.ZodOptional<z.ZodString>;
        assignedUsers: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        id?: string | undefined;
        assignedUsers?: number | undefined;
    }, {
        value: string;
        id?: string | undefined;
        assignedUsers?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    options: {
        value: string;
        id?: string | undefined;
        assignedUsers?: number | undefined;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    attrName: string;
}, {
    options: {
        value: string;
        id?: string | undefined;
        assignedUsers?: number | undefined;
    }[];
    type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
    attrName: string;
}>;
type FormValues = z.infer<typeof AttributeSchema>;
interface AttributeFormProps {
    initialValues?: FormValues;
    onSubmit: (values: FormValues) => void;
    header: React.ReactNode;
}
export declare function AttributeForm({ initialValues, onSubmit, header }: AttributeFormProps): JSX.Element;
export {};
//# sourceMappingURL=AttributesForm.d.ts.map