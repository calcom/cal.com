export const enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  BOOLEAN = "boolean",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  ADDRESS = "address",
  MULTI_EMAILS = "multiemail",
  CHECKBOX = "checkbox",
  RADIO_GROUP = "radio",
  URL = "url",
}

export const isValidRoutingFormFieldType = (type: string): type is RoutingFormFieldType => {
  return [
    RoutingFormFieldType.TEXT,
    RoutingFormFieldType.NUMBER,
    RoutingFormFieldType.TEXTAREA,
    RoutingFormFieldType.BOOLEAN,
    RoutingFormFieldType.SINGLE_SELECT,
    RoutingFormFieldType.MULTI_SELECT,
    RoutingFormFieldType.PHONE,
    RoutingFormFieldType.EMAIL,
    RoutingFormFieldType.ADDRESS,
    RoutingFormFieldType.MULTIPLE_EMAILS,
    RoutingFormFieldType.CHECKBOX,
    RoutingFormFieldType.RADIO_GROUP,
    RoutingFormFieldType.URL,
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
    label: "Boolean",
    value: RoutingFormFieldType.BOOLEAN,
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
    label: "Address",
    value: RoutingFormFieldType.ADDRESS,
  },
  {
    label: "Multiple Emails",
    value: RoutingFormFieldType.MULTI_EMAILS,
  },
  {
    label: "Checkbox Group",
    value: RoutingFormFieldType.CHECKBOX,
  },
  {
    label: "Radio Group",
    value: RoutingFormFieldType.RADIO_GROUP,
  },
  {
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
] as const;
