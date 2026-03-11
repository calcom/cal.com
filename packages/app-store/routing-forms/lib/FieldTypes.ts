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
  MULTI_EMAIL = "multiemail",
}

export const isValidRoutingFormFieldType = (type: string): type is RoutingFormFieldType => {
  return [
    RoutingFormFieldType.TEXT,
    RoutingFormFieldType.NUMBER,
    RoutingFormFieldType.TEXTAREA,
    RoutingFormFieldType.SINGLE_SELECT,
    RoutingFormFieldType.MULTI_SELECT,
    RoutingFormFieldType.PHONE,
    RoutingFormFieldType.EMAIL,
    RoutingFormFieldType.ADDRESS,
    RoutingFormFieldType.CHECKBOX,
    RoutingFormFieldType.RADIO,
    RoutingFormFieldType.BOOLEAN,
    RoutingFormFieldType.URL,
    RoutingFormFieldType.MULTI_EMAIL,
  ].includes(type as RoutingFormFieldType);
};

export const FIELD_TYPES_WITH_OPTIONS: ReadonlyArray<RoutingFormFieldType> = [
  RoutingFormFieldType.SINGLE_SELECT,
  RoutingFormFieldType.MULTI_SELECT,
  RoutingFormFieldType.CHECKBOX,
  RoutingFormFieldType.RADIO,
] as const;

export const FieldTypes = [
  {
    label: "Short text",
    value: RoutingFormFieldType.TEXT,
  },
  {
    label: "Number",
    value: RoutingFormFieldType.NUMBER,
  },
  {
    label: "Long text",
    value: RoutingFormFieldType.TEXTAREA,
  },
  {
    label: "Single-choice selection",
    value: RoutingFormFieldType.SINGLE_SELECT,
  },
  {
    label: "Multiple choice selection",
    value: RoutingFormFieldType.MULTI_SELECT,
  },
  {
    label: "Phone",
    value: RoutingFormFieldType.PHONE,
  },
  {
    label: "Email",
    value: RoutingFormFieldType.EMAIL,
  },
  {
    label: "Address",
    value: RoutingFormFieldType.ADDRESS,
  },
  {
    label: "Checkbox group",
    value: RoutingFormFieldType.CHECKBOX,
  },
  {
    label: "Radio group",
    value: RoutingFormFieldType.RADIO,
  },
  {
    label: "Checkbox (Yes/No)",
    value: RoutingFormFieldType.BOOLEAN,
  },
  {
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
  {
    label: "Multiple emails",
    value: RoutingFormFieldType.MULTI_EMAIL,
  },
] as const;

export const FIELD_TYPE_TO_RAQB_WIDGET_TYPE: Readonly<Record<RoutingFormFieldType, string>> = {
  [RoutingFormFieldType.TEXT]: "text",
  [RoutingFormFieldType.NUMBER]: "number",
  [RoutingFormFieldType.TEXTAREA]: "text",
  [RoutingFormFieldType.SINGLE_SELECT]: "select",
  [RoutingFormFieldType.MULTI_SELECT]: "multiselect",
  [RoutingFormFieldType.PHONE]: "text",
  [RoutingFormFieldType.EMAIL]: "text",
  [RoutingFormFieldType.ADDRESS]: "text",
  [RoutingFormFieldType.CHECKBOX]: "multiselect",
  [RoutingFormFieldType.RADIO]: "select",
  [RoutingFormFieldType.BOOLEAN]: "text",
  [RoutingFormFieldType.URL]: "text",
  [RoutingFormFieldType.MULTI_EMAIL]: "text",
} as const;
