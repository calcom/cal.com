import type { FieldType } from "@calcom/prisma/zod-utils";

import { fieldTypesConfigMap } from "./fieldTypes";

export const routingFormFieldTypes = Object.entries(fieldTypesConfigMap)
  .filter(([, config]) => !config.systemOnly)
  .map(([key, config]) => ({
    label: config.label,
    value: key as FieldType,
  }));

export function getFieldTypeConfig(type: string) {
  return fieldTypesConfigMap[type as FieldType];
}

export function isValidRoutingFormFieldType(type: string): type is FieldType {
  return routingFormFieldTypes.some((ft) => ft.value === type);
}

export function fieldTypeNeedsOptions(type: string): boolean {
  const config = getFieldTypeConfig(type);
  return config?.needsOptions ?? false;
}

