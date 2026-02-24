export const enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  // FormBuilder types mapped to compatible routing form widgets
  ADDRESS = "address",
  BOOLEAN = "boolean",
  CHECKBOX = "checkbox",
  MULTI_EMAIL = "multiemail",
  RADIO = "radio",
  RADIO_INPUT = "radioInput",
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
    RoutingFormFieldType.ADDRESS,
    RoutingFormFieldType.BOOLEAN,
    RoutingFormFieldType.CHECKBOX,
    RoutingFormFieldType.MULTI_EMAIL,
    RoutingFormFieldType.RADIO,
    RoutingFormFieldType.RADIO_INPUT,
    RoutingFormFieldType.URL,
  ].includes(type as RoutingFormFieldType);
};

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
    label: "Checkbox",
    value: RoutingFormFieldType.BOOLEAN,
  },
  {
    label: "Checkbox Group",
    value: RoutingFormFieldType.CHECKBOX,
  },
  {
    label: "Multiple Emails",
    value: RoutingFormFieldType.MULTI_EMAIL,
  },
  {
    label: "Radio Group",
    value: RoutingFormFieldType.RADIO,
  },
  {
    label: "Radio Input",
    value: RoutingFormFieldType.RADIO_INPUT,
  },
  {
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
] as const;
