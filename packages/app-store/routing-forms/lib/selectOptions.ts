import type { z } from "zod";

import type { zodNonRouterField } from "../zod";

type Field = z.infer<typeof zodNonRouterField>;

export const getFieldWithOptions = (field: Field) => {
  const legacySelectTextValues = field.selectText;
  if (field.options) {
    return {
      ...field,
      options: field.options,
    };
  } else if (legacySelectTextValues) {
    const options = legacySelectTextValues.split("\n").map((fieldValue) => ({
      label: fieldValue,
      id: null,
    }));
    return {
      ...field,
      options,
    };
  }
  return {
    ...field,
  };
};

export function getUIOptionsForSelect(field: Field) {
  return getFieldWithOptions(field).options?.map((option) => {
    return {
      value: option.id || option.label,
      title: option.label,
    };
  });
}
