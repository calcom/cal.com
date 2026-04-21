import type { fieldSchema, showConditionSchema } from "@calcom/prisma/zod-utils";
import type { z } from "zod";

type ShowCondition = z.infer<typeof showConditionSchema>;
type BookingField = z.infer<typeof fieldSchema>;

/**
 * Normalizes a response value to a flat array of string comparables. We treat
 * everything as strings to stay ORM-agnostic and avoid surprising coercions
 * between number/string responses across the booker form and server schema.
 *
 * Conditional questions (#11900) compare a parent response against one or more
 * configured values; supporting arrays makes checkbox/multiselect parents work
 * the same as scalar parents without branching at the call site.
 */
function normalizeResponse(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (v === null || v === undefined ? "" : String(v))).filter((v) => v !== "");
  }
  if (typeof value === "object") {
    // radioInput-style responses store `{ value, optionValue }`. The option key is
    // what the user picked so that's the sensible comparable for conditions.
    const maybeValue = (value as { value?: unknown }).value;
    if (maybeValue !== undefined) return normalizeResponse(maybeValue);
    return [];
  }
  const stringified = String(value);
  return stringified === "" ? [] : [stringified];
}

function toValueArray(value: ShowCondition["value"]): string[] {
  return Array.isArray(value) ? value.slice() : [value];
}

/**
 * Evaluates whether a field should be shown given the current form responses.
 *
 * A field without `showCondition` is always considered shown (returns `true`).
 * For fields with a `showCondition`, the parent response is normalized to a
 * string array and compared against the rule's configured value(s):
 *
 * - equals / notEquals: any single response value matches any configured value
 * - includes / notIncludes: the response array contains any configured value
 *
 * When the referenced parent field is missing or empty, `equals`/`includes`
 * evaluate to false (hide), while `notEquals`/`notIncludes` evaluate to true
 * (show). This matches common form-builder UX expectations.
 */
export function isFieldShownByCondition(
  field: Pick<BookingField, "showCondition">,
  responses: Record<string, unknown> | undefined | null
): boolean {
  const condition = field.showCondition;
  if (!condition) return true;

  const responseValues = normalizeResponse(responses?.[condition.fieldName]);
  const expectedValues = toValueArray(condition.value);

  switch (condition.op) {
    case "equals":
      return responseValues.some((r) => expectedValues.includes(r));
    case "notEquals":
      if (responseValues.length === 0) return true;
      return !responseValues.some((r) => expectedValues.includes(r));
    case "includes":
      return expectedValues.some((v) => responseValues.includes(v));
    case "notIncludes":
      return !expectedValues.some((v) => responseValues.includes(v));
    default:
      return true;
  }
}
