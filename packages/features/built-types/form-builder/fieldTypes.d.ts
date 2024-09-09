export declare const fieldTypesConfigMap: Record<"number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput", {
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
//# sourceMappingURL=fieldTypes.d.ts.map