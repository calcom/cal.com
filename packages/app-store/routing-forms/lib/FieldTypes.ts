export const enum RoutingFormFieldType {
  TEXT = "text",
  NUMBER = "number",
  TEXTAREA = "textarea",
  SINGLE_SELECT = "select",
  MULTI_SELECT = "multiselect",
  PHONE = "phone",
  EMAIL = "email",
  ADDRESS = "address",
  URL = "url",
  CHECKBOX_GROUP = "checkbox",
  RADIO_GROUP = "radio",
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
    RoutingFormFieldType.ADDRESS,
    RoutingFormFieldType.URL,
    RoutingFormFieldType.CHECKBOX_GROUP,
    RoutingFormFieldType.RADIO_GROUP,
    RoutingFormFieldType.BOOLEAN,
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
    label: "URL",
    value: RoutingFormFieldType.URL,
  },
  {
    label: "Checkbox group",
    value: RoutingFormFieldType.CHECKBOX_GROUP,
  },
  {
    label: "Radio group",
    value: RoutingFormFieldType.RADIO_GROUP,
  },
  {
    label: "Checkbox",
    value: RoutingFormFieldType.BOOLEAN,
  },
] as const;
