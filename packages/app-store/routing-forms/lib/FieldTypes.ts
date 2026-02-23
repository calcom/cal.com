import type { FieldType } from "@calcom/prisma/zod-utils";
import { fieldTypeEnum } from "@calcom/prisma/zod-utils";

/**
 * System-only field types excluded from routing forms.
 * These are tied to specific booking system behavior, not generic question types.
 */
const EXCLUDED_FIELD_TYPES = ["name", "radioInput"] as const;
type ExcludedFieldType = (typeof EXCLUDED_FIELD_TYPES)[number];

/**
 * Derived from the shared fieldTypeEnum in @calcom/prisma/zod-utils.
 * Adding a new type to fieldTypeEnum automatically makes it available
 * in routing forms (unless explicitly excluded above).
 */
export type RoutingFormFieldType = Exclude<FieldType, ExcludedFieldType>;

// Const object for backward compat — consumers use RoutingFormFieldType.SINGLE_SELECT etc.
export const RoutingFormFieldType = {
  TEXT: "text",
  NUMBER: "number",
  TEXTAREA: "textarea",
  SINGLE_SELECT: "select",
  MULTI_SELECT: "multiselect",
  PHONE: "phone",
  EMAIL: "email",
  MULTI_EMAIL: "multiemail",
  CHECKBOX: "checkbox",
  RADIO: "radio",
  BOOLEAN: "boolean",
  ADDRESS: "address",
  URL: "url",
} as const satisfies Record<string, RoutingFormFieldType>;

// Derive valid types from the shared fieldTypeEnum at runtime
const VALID_ROUTING_FORM_FIELD_TYPES: readonly string[] = fieldTypeEnum.options.filter(
  (type) => !(EXCLUDED_FIELD_TYPES as readonly string[]).includes(type)
);

export const isValidRoutingFormFieldType = (type: string): type is RoutingFormFieldType => {
  return VALID_ROUTING_FORM_FIELD_TYPES.includes(type);
};

/** Field types with options that need a listValues config in RAQB */
export const FIELD_TYPES_WITH_OPTIONS: readonly RoutingFormFieldType[] = [
  RoutingFormFieldType.SINGLE_SELECT,
  RoutingFormFieldType.MULTI_SELECT,
  RoutingFormFieldType.CHECKBOX,
  RoutingFormFieldType.RADIO,
];

/** Human-readable labels for routing form field types */
const FIELD_TYPE_LABELS: Partial<Record<RoutingFormFieldType, string>> = {
  text: "Short text",
  number: "Number",
  textarea: "Long text",
  select: "Single-choice selection",
  multiselect: "Multiple choice selection",
  phone: "Phone",
  email: "Email",
  multiemail: "Multiple emails",
  checkbox: "Checkbox group",
  radio: "Radio group",
  boolean: "Yes/No",
  address: "Address",
  url: "URL",
};

/** Derived from fieldTypeEnum — new types added there appear here automatically */
export const FieldTypes = VALID_ROUTING_FORM_FIELD_TYPES.map((type) => ({
  label: FIELD_TYPE_LABELS[type as RoutingFormFieldType] || type.charAt(0).toUpperCase() + type.slice(1),
  value: type as RoutingFormFieldType,
}));
