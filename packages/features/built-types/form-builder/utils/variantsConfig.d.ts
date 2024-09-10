import type z from "zod";
import type { useLocale } from "@calcom/lib/hooks/useLocale";
import type { fieldSchema } from "../schema";
type Field = z.infer<typeof fieldSchema>;
type Translate = ReturnType<typeof useLocale>["t"];
/**
 * Get's the field's variantsConfig and if not available, then it will get the default variantsConfig from the fieldTypesConfigMap
 */
export declare const getConfig: (field: Pick<Field, "variantsConfig" | "type">) => {
    variants: Record<string, {
        fields: {
            name: string;
            type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
            label?: string | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
            maxLength?: number | undefined;
        }[];
    }>;
} | undefined;
export declare const getTranslatedConfig: (field: Pick<Field, "variantsConfig" | "type">, translate: Translate) => {
    variants: Record<string, {
        fields: {
            name: string;
            type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
            label?: string | undefined;
            labelAsSafeHtml?: string | undefined;
            placeholder?: string | undefined;
            required?: boolean | undefined;
            minLength?: number | undefined;
            maxLength?: number | undefined;
        }[];
    }>;
} | undefined;
export {};
//# sourceMappingURL=variantsConfig.d.ts.map