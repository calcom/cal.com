import type z from "zod";

import type { useLocale } from "@calcom/lib/hooks/useLocale";
import type { fieldSchema } from "@calcom/prisma/zod-utils";

import { fieldTypesConfigMap } from "../fieldTypes";

type ConfigVariants = NonNullable<ReturnType<typeof getConfig>>["variants"];
type Field = z.infer<typeof fieldSchema>;
type Translate = ReturnType<typeof useLocale>["t"];

function getTranslatedConfigVariants(configVariants: ConfigVariants, translate: Translate) {
  return Object.entries(configVariants).reduce((variantsConfigVariants, [variantName, variant]) => {
    const translatedFields = variant.fields.map((field) => {
      const label = field.label ?? "";
      const placeholder = field.placeholder ?? "";
      return {
        ...field,
        label: translate(label),
        placeholder: translate(placeholder),
      };
    });
    variantsConfigVariants[variantName] = {
      ...variant,
      fields: translatedFields,
    };

    return variantsConfigVariants;
  }, {} as typeof configVariants);
}

/**
 * Gets the field's variantsConfig and if not available, then it will get the default variantsConfig from the fieldTypesConfigMap
 */
export const getConfig = (field: Pick<Field, "variantsConfig" | "type">) => {
  const fieldVariantsConfig = field.variantsConfig;
  const fieldTypeConfig = fieldTypesConfigMap[field.type as keyof typeof fieldTypesConfigMap];

  if (!fieldTypeConfig) throw new Error(`Invalid field.type ${field.type}}`);

  const defaultVariantsConfig = fieldTypeConfig?.variantsConfig?.defaultValue;
  const variantsConfig = fieldVariantsConfig || defaultVariantsConfig;

  if (fieldTypeConfig.propsType === "variants" && !variantsConfig) {
    throw new Error(`propsType variants must have variantsConfig`);
  }
  return variantsConfig;
};

export const getTranslatedConfig = (field: Pick<Field, "variantsConfig" | "type">, translate: Translate) => {
  const variantsConfig = getConfig(field);
  if (!variantsConfig) return variantsConfig;
  const newVariantsConfigVariants = getTranslatedConfigVariants(variantsConfig.variants, translate);

  return {
    ...variantsConfig,
    variants: newVariantsConfigVariants,
  };
};
