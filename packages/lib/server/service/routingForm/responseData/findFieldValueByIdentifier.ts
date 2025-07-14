import type { RoutingFormResponseData } from "./types";

export function findFieldValueByIdentifier(data: RoutingFormResponseData, identifier: string) {
  const field = data.fields.find((field) => field.identifier === identifier);
  if (!field) {
    return null;
  }

  const fieldValue = data.response[field.id]?.value;
  return fieldValue ?? null;
}
