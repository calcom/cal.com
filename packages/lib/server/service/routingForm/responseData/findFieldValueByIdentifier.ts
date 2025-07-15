import type { RoutingFormResponseData } from "./types";

export function findFieldValueByIdentifier(data: RoutingFormResponseData, identifier: string) {
  const field = data.fields.find((field) => field.identifier === identifier);
  if (!field) {
    throw new Error(`Field with identifier ${identifier} not found`);
  }

  const fieldValue = data.response[field.id]?.value;
  return fieldValue ?? null;
}
