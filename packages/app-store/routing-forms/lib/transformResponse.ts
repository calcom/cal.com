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
  if (field.type === "multiselect") {
    if (value instanceof Array) {
      return value;
    }
    return value
      .toString()
      .split(",")
      .map((v) => v.trim());
  }
  return value;
}
