import type { z } from "zod";

import type { Field, FormResponse } from "../types/types";
import { RoutingFormFieldType } from "./FieldTypes";
import { areSelectOptionsInLegacyFormat } from "./selectOptions";

function transformSelectValue({
  field,
  idOrLabel,
}: {
  field: Pick<Field, "options" | "type">;
  idOrLabel: string;
}) {
  idOrLabel = idOrLabel.trim();
  const options = field.options;
  if (!options) {
    return idOrLabel;
  }
  const shouldUseLabelAsValue = areSelectOptionsInLegacyFormat(
    field as typeof field & z.BRAND<"FIELD_WITH_OPTIONS">
  );
  const foundOptionById = options.find((option) => option.id === idOrLabel);
  if (foundOptionById) {
    if (shouldUseLabelAsValue) {
      return foundOptionById.label;
    }
    return foundOptionById.id!;
  }

  const foundOptionByLabel = options.find((option) => option.label === idOrLabel);
  if (foundOptionByLabel && !shouldUseLabelAsValue) {
    return foundOptionByLabel.id!;
  }

  return idOrLabel;
}

const MULTISELECT_FIELD_TYPES = new Set<string>([
  RoutingFormFieldType.MULTI_SELECT,
  RoutingFormFieldType.CHECKBOX,
]);

const SINGLE_SELECT_FIELD_TYPES = new Set<string>([
  RoutingFormFieldType.SINGLE_SELECT,
  RoutingFormFieldType.RADIO,
]);

export function getFieldResponseForJsonLogic({
  field,
  value,
}: {
  field: Pick<Field, "options" | "type">;
  value: FormResponse[string]["value"] | undefined;
}) {
  if (!value) {
    return "";
  }
  if (field.type === RoutingFormFieldType.NUMBER) {
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }

  if (MULTISELECT_FIELD_TYPES.has(field.type)) {
    let valueOrLabelArray = value instanceof Array ? value : value.toString().split(",");
    valueOrLabelArray = valueOrLabelArray.map((idOrLabel) => transformSelectValue({ field, idOrLabel }));
    return valueOrLabelArray;
  }

  if (SINGLE_SELECT_FIELD_TYPES.has(field.type)) {
    const valueAsStringOrStringArray = typeof value === "number" ? String(value) : value;
    const valueAsString =
      valueAsStringOrStringArray instanceof Array
        ? valueAsStringOrStringArray[0]
        : valueAsStringOrStringArray;

    return transformSelectValue({ field, idOrLabel: valueAsString });
  }
  return value;
}
