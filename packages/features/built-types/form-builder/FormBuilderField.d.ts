/// <reference types="react" />
import type { z } from "zod";
import type { fieldsSchema } from "./schema";
type RhfForm = {
    fields: z.infer<typeof fieldsSchema>;
};
type RhfFormFields = RhfForm["fields"];
type RhfFormField = RhfFormFields[number];
type ValueProps = {
    value: string[];
    setValue: (value: string[]) => void;
} | {
    value: string;
    setValue: (value: string) => void;
} | {
    value: {
        value: string;
        optionValue: string;
    };
    setValue: (value: {
        value: string;
        optionValue: string;
    }) => void;
} | {
    value: boolean;
    setValue: (value: boolean) => void;
};
export declare const FormBuilderField: ({ field, readOnly, className, }: {
    field: RhfFormFields[number];
    readOnly: boolean;
    className: string;
}) => JSX.Element;
export declare const ComponentForField: ({ field, value, setValue, readOnly, noLabel, translatedDefaultLabel, }: {
    field: Omit<RhfFormField, "editable" | "label"> & {
        label?: string;
    };
    readOnly: boolean;
    noLabel?: boolean | undefined;
    translatedDefaultLabel?: string | undefined;
} & ValueProps) => JSX.Element | null;
export {};
//# sourceMappingURL=FormBuilderField.d.ts.map