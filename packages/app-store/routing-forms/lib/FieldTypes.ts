export const enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  URL = "url",
  ADDRESS = "address",
  MULTI_EMAIL = "multiemail",
  RADIO = "radio",
  CHECKBOX = "checkbox",
  BOOLEAN = "boolean",
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
    RoutingFormFieldType.URL,
    RoutingFormFieldType.ADDRESS,
    RoutingFormFieldType.MULTI_EMAIL,
    RoutingFormFieldType.RADIO,
    RoutingFormFieldType.CHECKBOX,
    RoutingFormFieldType.BOOLEAN,
  ].includes(type as RoutingFormFieldType);
};

export const FieldTypes = [
  {
    label: "Short Text",
    value: RoutingFormFieldType.TEXT,
  },
  {
    label: "Number",
    value: RoutingFormFieldType.NUMBER,
  },
  {
    label: "Long Text",
    value: RoutingFormFieldType.TEXTAREA,
  },
  {
    label: "Single Selection",
    value: RoutingFormFieldType.SINGLE_SELECT,
  },
  {
    label: "Multiple Selection",
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
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
  {
    label: "Address",
    value: RoutingFormFieldType.ADDRESS,
  },
  {
    label: "Multiple Email",
    value: RoutingFormFieldType.MULTI_EMAIL,
  },
  {
    label: "Radio Group",
    value: RoutingFormFieldType.RADIO,
  },
  {
    label: "Check box",
    value: RoutingFormFieldType.CHECKBOX,
  },
  {
    label: "Boolean",
    value: RoutingFormFieldType.BOOLEAN,
  },
] as const;
