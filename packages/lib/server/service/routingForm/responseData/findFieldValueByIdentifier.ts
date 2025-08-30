import getFieldIdentifier from "@calcom/app-store/routing-forms/lib/getFieldIdentifier";

import type { RoutingFormResponseData } from "./types";

type FindFieldValueByIdentifierResult =
  | { success: true; data: string | string[] | number | null }
  | { success: false; error: string };

export function findFieldValueByIdentifier(
  data: RoutingFormResponseData,
  identifier: string
): FindFieldValueByIdentifierResult {
  const field = data.fields.find((field) => getFieldIdentifier(field) === identifier);
  if (!field) {
    return { success: false, error: `Field with identifier ${identifier} not found` };
  }

  const fieldValue = data.response[field.id]?.value;

  return { success: true, data: fieldValue ?? null };
}
