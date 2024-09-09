import { z } from "zod";
declare const fieldTypeEnum: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
export type FieldType = z.infer<typeof fieldTypeEnum>;
export declare const EditableSchema: z.ZodEnum<["system", "system-but-optional", "system-but-hidden", "user", "user-readonly"]>;
export declare const variantsConfigSchema: z.ZodObject<{
    variants: z.ZodRecord<z.ZodString, z.ZodObject<{
        /**
         * Variant Fields schema for a variant of the main field.
         * It doesn't support non text fields as of now
         **/
        fields: z.ZodArray<z.ZodObject<Omit<{
            name: z.ZodEffects<z.ZodString, string, string>;
            type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
            label: z.ZodOptional<z.ZodString>;
            labelAsSafeHtml: z.ZodOptional<z.ZodString>;
            /**
             * It is the default label that will be used when a new field is created.
             * Note: It belongs in FieldsTypeConfig, so that changing defaultLabel in code can work for existing fields as well(for fields that are using the default label).
             * Supports translation
             */
            defaultLabel: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            /**
             * It is the default placeholder that will be used when a new field is created.
             * Note: Same as defaultLabel, it belongs in FieldsTypeConfig
             * Supports translation
             */
            defaultPlaceholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            /**
             * It is the list of options that is valid for a certain type of fields.
             *
             */
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                value: string;
            }, {
                label: string;
                value: string;
            }>, "many">>;
            /**
             * This is an alternate way to specify options when the options are stored elsewhere. Form Builder expects options to be present at `dataStore[getOptionsAt]`
             * This allows keeping a single source of truth in DB.
             */
            getOptionsAt: z.ZodOptional<z.ZodString>;
            /**
             * For `radioInput` type of questions, it stores the input that is shown based on the user option selected.
             * e.g. If user is given a list of locations and he selects "Phone", then he will be shown a phone input
             */
            optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                type: z.ZodEnum<["address", "phone", "text"]>;
                required: z.ZodOptional<z.ZodBoolean>;
                placeholder: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                type: "text" | "address" | "phone";
                required?: boolean | undefined;
                placeholder?: string | undefined;
            }, {
                type: "text" | "address" | "phone";
                required?: boolean | undefined;
                placeholder?: string | undefined;
            }>>>;
            /**
             * It is the minimum number of characters that can be entered in the field.
             * It is used for types with `supportsLengthCheck= true`.
             * @default 0
             * @requires supportsLengthCheck = true
             */
            minLength: z.ZodOptional<z.ZodNumber>;
            /**
             * It is the maximum number of characters that can be entered in the field.
             * It is used for types with `supportsLengthCheck= true`.
             * @requires supportsLengthCheck = true
             */
            maxLength: z.ZodOptional<z.ZodNumber>;
        }, "options" | "defaultLabel" | "defaultPlaceholder" | "getOptionsAt" | "optionsInputs">, "strip", z.ZodTypeAny, {
            type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
            name: string;
            label?: string | undefined;
            maxLength?: number | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
        }, {
            type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
            name: string;
            label?: string | undefined;
            maxLength?: number | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        fields: {
            type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
            name: string;
            label?: string | undefined;
            maxLength?: number | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
        }[];
    }, {
        fields: {
            type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
            name: string;
            label?: string | undefined;
            maxLength?: number | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    variants: Record<string, {
        fields: {
            type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
            name: string;
            label?: string | undefined;
            maxLength?: number | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
        }[];
    }>;
}, {
    variants: Record<string, {
        fields: {
            type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
            name: string;
            label?: string | undefined;
            maxLength?: number | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
        }[];
    }>;
}>;
export type ALL_VIEWS = "ALL_VIEWS";
export declare const fieldTypeConfigSchema: z.ZodEffects<z.ZodObject<{
    label: z.ZodString;
    value: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
    isTextType: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    systemOnly: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    needsOptions: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    supportsLengthCheck: z.ZodOptional<z.ZodObject<{
        maxLength: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxLength: number;
    }, {
        maxLength: number;
    }>>;
    propsType: z.ZodEnum<["text", "textList", "select", "multiselect", "boolean", "objectiveWithInput", "variants"]>;
    variantsConfig: z.ZodOptional<z.ZodObject<{
        /**
         * This is the default variant that will be used when a new field is created.
         */
        defaultVariant: z.ZodString;
        /**
         *  Used only when there are 2 variants, so that UI can be simplified by showing a switch(with this label) instead of a Select
         */
        toggleLabel: z.ZodOptional<z.ZodString>;
        variants: z.ZodRecord<z.ZodString, z.ZodObject<{
            /**
             * That's how the variant would be labelled in App UI. This label represents the field in booking questions' list
             * Supports translation
             */
            label: z.ZodString;
            fieldsMap: z.ZodRecord<z.ZodString, z.ZodObject<{
                /**
                 * Supports translation
                 */
                defaultLabel: z.ZodOptional<z.ZodString>;
                /**
                 * Supports translation
                 */
                defaultPlaceholder: z.ZodOptional<z.ZodString>;
                /**
                 * Decides if a variant field's required property can be changed or not
                 */
                canChangeRequirability: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            }, "strip", z.ZodTypeAny, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>>;
        /**
         * This is the default configuration for the field.
         */
        defaultValue: z.ZodOptional<z.ZodObject<{
            variants: z.ZodRecord<z.ZodString, z.ZodObject<{
                /**
                 * Variant Fields schema for a variant of the main field.
                 * It doesn't support non text fields as of now
                 **/
                fields: z.ZodArray<z.ZodObject<Omit<{
                    name: z.ZodEffects<z.ZodString, string, string>;
                    type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
                    label: z.ZodOptional<z.ZodString>;
                    labelAsSafeHtml: z.ZodOptional<z.ZodString>;
                    /**
                     * It is the default label that will be used when a new field is created.
                     * Note: It belongs in FieldsTypeConfig, so that changing defaultLabel in code can work for existing fields as well(for fields that are using the default label).
                     * Supports translation
                     */
                    defaultLabel: z.ZodOptional<z.ZodString>;
                    placeholder: z.ZodOptional<z.ZodString>;
                    /**
                     * It is the default placeholder that will be used when a new field is created.
                     * Note: Same as defaultLabel, it belongs in FieldsTypeConfig
                     * Supports translation
                     */
                    defaultPlaceholder: z.ZodOptional<z.ZodString>;
                    required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                    /**
                     * It is the list of options that is valid for a certain type of fields.
                     *
                     */
                    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        label: z.ZodString;
                        value: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        label: string;
                        value: string;
                    }, {
                        label: string;
                        value: string;
                    }>, "many">>;
                    /**
                     * This is an alternate way to specify options when the options are stored elsewhere. Form Builder expects options to be present at `dataStore[getOptionsAt]`
                     * This allows keeping a single source of truth in DB.
                     */
                    getOptionsAt: z.ZodOptional<z.ZodString>;
                    /**
                     * For `radioInput` type of questions, it stores the input that is shown based on the user option selected.
                     * e.g. If user is given a list of locations and he selects "Phone", then he will be shown a phone input
                     */
                    optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                        type: z.ZodEnum<["address", "phone", "text"]>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        placeholder: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        type: "text" | "address" | "phone";
                        required?: boolean | undefined;
                        placeholder?: string | undefined;
                    }, {
                        type: "text" | "address" | "phone";
                        required?: boolean | undefined;
                        placeholder?: string | undefined;
                    }>>>;
                    /**
                     * It is the minimum number of characters that can be entered in the field.
                     * It is used for types with `supportsLengthCheck= true`.
                     * @default 0
                     * @requires supportsLengthCheck = true
                     */
                    minLength: z.ZodOptional<z.ZodNumber>;
                    /**
                     * It is the maximum number of characters that can be entered in the field.
                     * It is used for types with `supportsLengthCheck= true`.
                     * @requires supportsLengthCheck = true
                     */
                    maxLength: z.ZodOptional<z.ZodNumber>;
                }, "options" | "defaultLabel" | "defaultPlaceholder" | "getOptionsAt" | "optionsInputs">, "strip", z.ZodTypeAny, {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }, {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        }, {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        }>>;
    }, "strip", z.ZodTypeAny, {
        variants: Record<string, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>;
        defaultVariant: string;
        toggleLabel?: string | undefined;
        defaultValue?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
    }, {
        variants: Record<string, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>;
        defaultVariant: string;
        toggleLabel?: string | undefined;
        defaultValue?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    value: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    propsType: "boolean" | "text" | "select" | "variants" | "multiselect" | "textList" | "objectiveWithInput";
    isTextType?: boolean | undefined;
    systemOnly?: boolean | undefined;
    needsOptions?: boolean | undefined;
    supportsLengthCheck?: {
        maxLength: number;
    } | undefined;
    variantsConfig?: {
        variants: Record<string, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>;
        defaultVariant: string;
        toggleLabel?: string | undefined;
        defaultValue?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
    } | undefined;
}, {
    label: string;
    value: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    propsType: "boolean" | "text" | "select" | "variants" | "multiselect" | "textList" | "objectiveWithInput";
    isTextType?: boolean | undefined;
    systemOnly?: boolean | undefined;
    needsOptions?: boolean | undefined;
    supportsLengthCheck?: {
        maxLength: number;
    } | undefined;
    variantsConfig?: {
        variants: Record<string, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>;
        defaultVariant: string;
        toggleLabel?: string | undefined;
        defaultValue?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
    } | undefined;
}>, {
    label: string;
    value: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    propsType: "boolean" | "text" | "select" | "variants" | "multiselect" | "textList" | "objectiveWithInput";
    isTextType?: boolean | undefined;
    systemOnly?: boolean | undefined;
    needsOptions?: boolean | undefined;
    supportsLengthCheck?: {
        maxLength: number;
    } | undefined;
    variantsConfig?: {
        variants: Record<string, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>;
        defaultVariant: string;
        toggleLabel?: string | undefined;
        defaultValue?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
    } | undefined;
}, {
    label: string;
    value: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    propsType: "boolean" | "text" | "select" | "variants" | "multiselect" | "textList" | "objectiveWithInput";
    isTextType?: boolean | undefined;
    systemOnly?: boolean | undefined;
    needsOptions?: boolean | undefined;
    supportsLengthCheck?: {
        maxLength: number;
    } | undefined;
    variantsConfig?: {
        variants: Record<string, {
            label: string;
            fieldsMap: Record<string, {
                defaultLabel?: string | undefined;
                defaultPlaceholder?: string | undefined;
                canChangeRequirability?: boolean | undefined;
            }>;
        }>;
        defaultVariant: string;
        toggleLabel?: string | undefined;
        defaultValue?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
    } | undefined;
}>;
/**
 * Main field Schema
 */
export declare const fieldSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
    name: z.ZodEffects<z.ZodString, string, string>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    defaultLabel: z.ZodOptional<z.ZodString>;
    defaultPlaceholder: z.ZodOptional<z.ZodString>;
    labelAsSafeHtml: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    getOptionsAt: z.ZodOptional<z.ZodString>;
    optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodEnum<["address", "phone", "text"]>;
        required: z.ZodOptional<z.ZodBoolean>;
        placeholder: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }>>>;
    minLength: z.ZodOptional<z.ZodNumber>;
    variant: z.ZodOptional<z.ZodString>;
    variantsConfig: z.ZodOptional<z.ZodObject<{
        variants: z.ZodRecord<z.ZodString, z.ZodObject<{
            /**
             * Variant Fields schema for a variant of the main field.
             * It doesn't support non text fields as of now
             **/
            fields: z.ZodArray<z.ZodObject<Omit<{
                name: z.ZodEffects<z.ZodString, string, string>;
                type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
                label: z.ZodOptional<z.ZodString>;
                labelAsSafeHtml: z.ZodOptional<z.ZodString>;
                /**
                 * It is the default label that will be used when a new field is created.
                 * Note: It belongs in FieldsTypeConfig, so that changing defaultLabel in code can work for existing fields as well(for fields that are using the default label).
                 * Supports translation
                 */
                defaultLabel: z.ZodOptional<z.ZodString>;
                placeholder: z.ZodOptional<z.ZodString>;
                /**
                 * It is the default placeholder that will be used when a new field is created.
                 * Note: Same as defaultLabel, it belongs in FieldsTypeConfig
                 * Supports translation
                 */
                defaultPlaceholder: z.ZodOptional<z.ZodString>;
                required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                /**
                 * It is the list of options that is valid for a certain type of fields.
                 *
                 */
                options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    label: string;
                    value: string;
                }, {
                    label: string;
                    value: string;
                }>, "many">>;
                /**
                 * This is an alternate way to specify options when the options are stored elsewhere. Form Builder expects options to be present at `dataStore[getOptionsAt]`
                 * This allows keeping a single source of truth in DB.
                 */
                getOptionsAt: z.ZodOptional<z.ZodString>;
                /**
                 * For `radioInput` type of questions, it stores the input that is shown based on the user option selected.
                 * e.g. If user is given a list of locations and he selects "Phone", then he will be shown a phone input
                 */
                optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                    type: z.ZodEnum<["address", "phone", "text"]>;
                    required: z.ZodOptional<z.ZodBoolean>;
                    placeholder: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    type: "text" | "address" | "phone";
                    required?: boolean | undefined;
                    placeholder?: string | undefined;
                }, {
                    type: "text" | "address" | "phone";
                    required?: boolean | undefined;
                    placeholder?: string | undefined;
                }>>>;
                /**
                 * It is the minimum number of characters that can be entered in the field.
                 * It is used for types with `supportsLengthCheck= true`.
                 * @default 0
                 * @requires supportsLengthCheck = true
                 */
                minLength: z.ZodOptional<z.ZodNumber>;
                /**
                 * It is the maximum number of characters that can be entered in the field.
                 * It is used for types with `supportsLengthCheck= true`.
                 * @requires supportsLengthCheck = true
                 */
                maxLength: z.ZodOptional<z.ZodNumber>;
            }, "options" | "defaultLabel" | "defaultPlaceholder" | "getOptionsAt" | "optionsInputs">, "strip", z.ZodTypeAny, {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }, {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    }, {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    }>>;
    views: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        id: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        description?: string | undefined;
    }, {
        label: string;
        id: string;
        description?: string | undefined;
    }>, "many">>;
    hideWhenJustOneOption: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    editable: z.ZodOptional<z.ZodDefault<z.ZodEnum<["system", "system-but-optional", "system-but-hidden", "user", "user-readonly"]>>>;
    sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodUnion<[z.ZodLiteral<"user">, z.ZodLiteral<"system">, z.ZodString]>;
        label: z.ZodString;
        editUrl: z.ZodOptional<z.ZodString>;
        fieldRequired: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }, {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }>, "many">>;
    disableOnPrefill: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
}, {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
}>;
export declare const fieldsSchema: z.ZodArray<z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">>;
    name: z.ZodEffects<z.ZodString, string, string>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    defaultLabel: z.ZodOptional<z.ZodString>;
    defaultPlaceholder: z.ZodOptional<z.ZodString>;
    labelAsSafeHtml: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    getOptionsAt: z.ZodOptional<z.ZodString>;
    optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodEnum<["address", "phone", "text"]>;
        required: z.ZodOptional<z.ZodBoolean>;
        placeholder: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }>>>;
    minLength: z.ZodOptional<z.ZodNumber>;
    variant: z.ZodOptional<z.ZodString>;
    variantsConfig: z.ZodOptional<z.ZodObject<{
        variants: z.ZodRecord<z.ZodString, z.ZodObject<{
            /**
             * Variant Fields schema for a variant of the main field.
             * It doesn't support non text fields as of now
             **/
            fields: z.ZodArray<z.ZodObject<Omit<{
                name: z.ZodEffects<z.ZodString, string, string>;
                type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
                label: z.ZodOptional<z.ZodString>;
                labelAsSafeHtml: z.ZodOptional<z.ZodString>;
                /**
                 * It is the default label that will be used when a new field is created.
                 * Note: It belongs in FieldsTypeConfig, so that changing defaultLabel in code can work for existing fields as well(for fields that are using the default label).
                 * Supports translation
                 */
                defaultLabel: z.ZodOptional<z.ZodString>;
                placeholder: z.ZodOptional<z.ZodString>;
                /**
                 * It is the default placeholder that will be used when a new field is created.
                 * Note: Same as defaultLabel, it belongs in FieldsTypeConfig
                 * Supports translation
                 */
                defaultPlaceholder: z.ZodOptional<z.ZodString>;
                required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                /**
                 * It is the list of options that is valid for a certain type of fields.
                 *
                 */
                options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    label: string;
                    value: string;
                }, {
                    label: string;
                    value: string;
                }>, "many">>;
                /**
                 * This is an alternate way to specify options when the options are stored elsewhere. Form Builder expects options to be present at `dataStore[getOptionsAt]`
                 * This allows keeping a single source of truth in DB.
                 */
                getOptionsAt: z.ZodOptional<z.ZodString>;
                /**
                 * For `radioInput` type of questions, it stores the input that is shown based on the user option selected.
                 * e.g. If user is given a list of locations and he selects "Phone", then he will be shown a phone input
                 */
                optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                    type: z.ZodEnum<["address", "phone", "text"]>;
                    required: z.ZodOptional<z.ZodBoolean>;
                    placeholder: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    type: "text" | "address" | "phone";
                    required?: boolean | undefined;
                    placeholder?: string | undefined;
                }, {
                    type: "text" | "address" | "phone";
                    required?: boolean | undefined;
                    placeholder?: string | undefined;
                }>>>;
                /**
                 * It is the minimum number of characters that can be entered in the field.
                 * It is used for types with `supportsLengthCheck= true`.
                 * @default 0
                 * @requires supportsLengthCheck = true
                 */
                minLength: z.ZodOptional<z.ZodNumber>;
                /**
                 * It is the maximum number of characters that can be entered in the field.
                 * It is used for types with `supportsLengthCheck= true`.
                 * @requires supportsLengthCheck = true
                 */
                maxLength: z.ZodOptional<z.ZodNumber>;
            }, "options" | "defaultLabel" | "defaultPlaceholder" | "getOptionsAt" | "optionsInputs">, "strip", z.ZodTypeAny, {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }, {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    }, {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    }>>;
    views: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        id: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        description?: string | undefined;
    }, {
        label: string;
        id: string;
        description?: string | undefined;
    }>, "many">>;
    hideWhenJustOneOption: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    editable: z.ZodOptional<z.ZodDefault<z.ZodEnum<["system", "system-but-optional", "system-but-hidden", "user", "user-readonly"]>>>;
    sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodUnion<[z.ZodLiteral<"user">, z.ZodLiteral<"system">, z.ZodString]>;
        label: z.ZodString;
        editUrl: z.ZodOptional<z.ZodString>;
        fieldRequired: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }, {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }>, "many">>;
    disableOnPrefill: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
}, {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
}>, "many">;
export declare const fieldTypesSchemaMap: Partial<Record<FieldType, {
    /**
     * - preprocess the responses received through prefill query params
     * - preprocess the values being filled in the booking form.
     * - does not run for the responses received from DB
     */
    preprocess: (data: {
        field: z.infer<typeof fieldSchema>;
        response: string;
        isPartialSchema: boolean;
    }) => unknown;
    /**
     * - Validates the response received through prefill query params
     * - Validates the values being filled in the booking form.
     * - does not run for the responses received from DB
     */
    superRefine: (data: {
        field: z.infer<typeof fieldSchema>;
        response: string;
        isPartialSchema: boolean;
        ctx: z.RefinementCtx;
        m: (key: string) => string;
    }) => void;
}>>;
/**
 * DB Read schema has no field type based validation because user might change the type of a field from Type1 to Type2 after some data has been collected with Type1.
 * Parsing that type1 data with type2 schema will fail.
 * So, we just validate that the response conforms to one of the field types' schema.
 */
export declare const dbReadResponseSchema: z.ZodUnion<[z.ZodString, z.ZodBoolean, z.ZodArray<z.ZodString, "many">, z.ZodObject<{
    optionValue: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    optionValue: string;
}, {
    value: string;
    optionValue: string;
}>, z.ZodRecord<z.ZodString, z.ZodString>]>;
export {};
//# sourceMappingURL=schema.d.ts.map