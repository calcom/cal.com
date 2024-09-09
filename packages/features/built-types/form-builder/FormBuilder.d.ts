/// <reference types="react" />
import type { z } from "zod";
import type { fieldsSchema } from "./schema";
type RhfForm = {
    fields: z.infer<typeof fieldsSchema>;
};
type RhfFormFields = RhfForm["fields"];
type RhfFormField = RhfFormFields[number];
/**
 * It works with a react-hook-form only.
 * `formProp` specifies the name of the property in the react-hook-form that has the fields. This is where fields would be updated.
 */
export declare const FormBuilder: ({ title, description, addFieldLabel, formProp, disabled, LockedIcon, dataStore, shouldConsiderRequired, }: {
    formProp: string;
    title: string;
    description: string;
    addFieldLabel: string;
    disabled: boolean;
    LockedIcon: false | JSX.Element;
    /**
     * A readonly dataStore that is used to lookup the options for the fields. It works in conjunction with the field.getOptionAt property which acts as the key in options
     */
    dataStore: {
        options: Record<string, {
            source: {
                label: string;
            };
            value: {
                label: string;
                value: string;
                inputPlaceholder?: string;
            }[];
        }>;
    };
    /**
     * This is kind of a hack to allow certain fields to be just shown as required when they might not be required in a strict sense
     * e.g. Location field has a default value at backend so API can send no location but formBuilder in UI doesn't allow it.
     */
    shouldConsiderRequired?: ((field: RhfFormField) => boolean | undefined) | undefined;
}) => JSX.Element;
export {};
//# sourceMappingURL=FormBuilder.d.ts.map