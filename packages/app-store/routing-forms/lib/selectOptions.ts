/**
 * @fileoverview
 *
 * This file holds the utilities to build the options to render in the select field and it could be loaded on client side as well.
 */
import type { z } from "zod";

import type { zodFieldView } from "../zod";

type Field = z.infer<typeof zodFieldView>;

const buildOptionsFromLegacySelectText = ({ legacySelectText }: { legacySelectText: string }) => {
  return legacySelectText
    .trim()
    .split("\n")
    .map((fieldValue) => ({
      label: fieldValue,
      id: null,
    }));
};

export const getFieldWithOptions = <T extends Field>(field: T) => {
  const legacySelectText = field.selectText;
  if (field.options) {
    return {
      ...field,
      options: field.options,
    };
  } else if (legacySelectText) {
    const options = buildOptionsFromLegacySelectText({ legacySelectText });
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
    // We prefer option.id as that doesn't change when we change the option text/label.
    // Fallback to option.label for fields saved in DB in old format which didn't have `options`
    const value = option.id ?? option.label;
    return {
      value,
      title: option.label,
    };
  });
}
