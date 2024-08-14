import type { Field, Response } from "../types/types";

export default function transformResponse({
  field,
  value,
}: {
  field: Field;
  value: Response[string]["value"] | undefined;
}) {
  if (!value) {
    return "";
  }
  // type="number" still gives value as a string but we need to store that as number so that number operators can work.
  if (field.type === "number") {
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }
  if (field.type === "multiselect" || field.type === "select") {
    // Could be option id(i.e. a UUIDv4) or option label for ease of prefilling
    let valueOrLabelArray =
      value instanceof Array
        ? value
        : value
            .toString()
            .split(",")
            .map((v) => v.trim());

    const areOptionsInLegacyFormat = !!field.options?.find((option) => !option.id);
    const shouldUseLabelAsValue = areOptionsInLegacyFormat;
    const options = field.options;
    if (!options) {
      return valueOrLabelArray;
    }
    valueOrLabelArray = valueOrLabelArray.map((idOrLabel) => {
      const foundOptionById = options.find((option) => {
        return option.id === idOrLabel;
      });

      if (foundOptionById) {
        if (shouldUseLabelAsValue) {
          return foundOptionById.label;
        } else {
          // If shouldUseLabelAsValue is false, then we must use id as value
          // Because shouldUseLabelAsValue is false, id must be set already
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return foundOptionById.id!;
        }
      } else {
        // No option was found that matches ID
        // So check if the label is provided
        const foundOptionByLabel = options.find((option) => {
          return option.label === idOrLabel;
        });
        if (foundOptionByLabel) {
          if (!shouldUseLabelAsValue) {
            // If shouldUseLabelAsValue is false, then we must use id as value
            // Because shouldUseLabelAsValue is false, id must be set already
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return foundOptionByLabel.id!;
          }
        }
      }
      return idOrLabel;
    });

    if (field.type === "select") {
      return valueOrLabelArray[0];
    }
    return valueOrLabelArray;
  }
  return value;
}
