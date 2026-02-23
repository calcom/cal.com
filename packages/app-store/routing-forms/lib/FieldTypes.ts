export enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  MULTI_EMAIL = "multiemail",
  CHECKBOX = "checkbox",
  RADIO = "radio",
  BOOLEAN = "boolean",
  ADDRESS = "address",
  URL = "url",
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
    RoutingFormFieldType.MULTI_EMAIL,
    RoutingFormFieldType.CHECKBOX,
    RoutingFormFieldType.RADIO,
    RoutingFormFieldType.BOOLEAN,
    RoutingFormFieldType.ADDRESS,
    RoutingFormFieldType.URL,
  ].includes(type as RoutingFormFieldType);
};

/** Field types with options that need a listValues config in RAQB */
export const FIELD_TYPES_WITH_OPTIONS: readonly RoutingFormFieldType[] = [
  RoutingFormFieldType.SINGLE_SELECT,
  RoutingFormFieldType.MULTI_SELECT,
  RoutingFormFieldType.CHECKBOX,
  RoutingFormFieldType.RADIO,
];

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
    label: "Multiple emails",
    value: RoutingFormFieldType.MULTI_EMAIL,
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
    label: "Yes/No",
    value: RoutingFormFieldType.BOOLEAN,
  },
  {
    label: "Address",
    value: RoutingFormFieldType.ADDRESS,
  },
  {
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
] as const;
