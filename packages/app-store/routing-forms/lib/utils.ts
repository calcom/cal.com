import { createHash } from "crypto";

import type { Fields, FormResponse } from "../types/types";
import getFieldIdentifier from "./getFieldIdentifier";

/**
 * Generates a hash for a form response
 */
export function generateResponseHash({
  response,
  fields,
}: {
  response: FormResponse;
  fields: NonNullable<Fields>;
}): string {
  // Create a normalized version of the response (lowercase)
  const normalizedResponse = JSON.stringify(
    Object.entries(response)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .reduce((acc, [key, value]) => {
        const field = fields.find((f) => f.id === key);
        if (field) {
          return { ...acc, [getFieldIdentifier(field)]: value.value };
        }
        return acc;
      }, {})
  ).toLowerCase();
  console.log("normalizedResponse", normalizedResponse);

  return createHash("sha256").update(normalizedResponse).digest("hex");
}
