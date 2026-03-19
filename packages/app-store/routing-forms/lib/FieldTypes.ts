import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";

export enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
}

export const FieldTypes = Object.values(fieldTypesConfigMap)
  .filter((fieldType) => !fieldType.systemOnly)
  .map((fieldType) => ({
    label: fieldType.label,
    value: fieldType.value,
  }));

export const isValidRoutingFormFieldType = (type: string): type is RoutingFormFieldType => {
  return FieldTypes.some((f) => f.value === type);
};
