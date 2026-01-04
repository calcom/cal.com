import {
  routingFormFieldTypes,
  isValidRoutingFormFieldType as isValidType,
  getFieldTypeConfig,
  fieldTypeNeedsOptions,
} from "@calcom/features/form-builder/fieldTypesForRoutingForms";
import type { FieldType } from "@calcom/prisma/zod-utils";

/**
 * @deprecated Use FieldType from @calcom/prisma/zod-utils instead.
 * This enum is kept for backwards compatibility with existing code.
 */
export const enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  ADDRESS = "address",
  CHECKBOX = "checkbox",
  RADIO = "radio",
  BOOLEAN = "boolean",
  URL = "url",
  MULTIEMAIL = "multiemail",
}


export const isValidRoutingFormFieldType = isValidType;


export const FieldTypes = routingFormFieldTypes;

export { getFieldTypeConfig, fieldTypeNeedsOptions };

export function isFieldTypeWithOptions(type: string): boolean {
  return fieldTypeNeedsOptions(type);
}

export function getDefaultFieldType(): FieldType {
  return "text";
}
