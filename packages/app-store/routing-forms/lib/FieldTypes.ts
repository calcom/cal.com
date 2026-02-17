export enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  ADDRESS = "address",
  MULTIEMAIL = "multiemail",
  CHECKBOX = "checkbox",
  RADIO = "radio",
  BOOLEAN = "boolean",
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
    RoutingFormFieldType.MULTIEMAIL,
    RoutingFormFieldType.CHECKBOX,
    RoutingFormFieldType.RADIO,
    RoutingFormFieldType.BOOLEAN,
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
    label: "Multiple Emails",
    value: RoutingFormFieldType.MULTIEMAIL,
  },
  {
    label: "Checkbox Group",
    value: RoutingFormFieldType.CHECKBOX,
  },
  {
    label: "Radio Group",
    value: RoutingFormFieldType.RADIO,
  },
  {
    label: "Checkbox",
    value: RoutingFormFieldType.BOOLEAN,
  },
  {
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
] as const;
