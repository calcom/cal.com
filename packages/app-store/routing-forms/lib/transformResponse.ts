import type { Field, Response } from "../types/types";

export default function transformResponse({
  field,
  value,
}: {
  field: Field;
  value: Response[string]["value"];
}) {
  // type="number" still gives value as a string but we need to store that as number so that number operators can work.
  return field.type === "number" && typeof value === "string" ? Number(value) : value;
}
