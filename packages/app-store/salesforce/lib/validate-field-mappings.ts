import type { Connection, Field } from "@jsforce/jsforce-node";

import { SalesforceFieldType } from "./enums";
import type { WriteToBookingEntry } from "../zod";
import { isWriteToBookingEntry } from "../zod";

export type FieldValidationError = {
  field: string;
  error: string;
};

/**
 * Validates Salesforce field mappings against the actual org schema by calling
 * `conn.describe(sobject)`. Returns an empty array if all mappings are valid.
 *
 * Checks per field:
 * - Existence: field name must exist on the SObject
 * - Writable: field.updateable must be true
 * - Checkbox type: if configured as checkbox, SF field must be boolean (and vice versa)
 * - Picklist value: configured value must be in the field's active picklist values
 */
export async function validateSalesforceFieldMappings(
  conn: Connection,
  mappings: Record<string, string | boolean | WriteToBookingEntry>,
  sobject: string
): Promise<FieldValidationError[]> {
  const errors: FieldValidationError[] = [];
  const fieldNames = Object.keys(mappings);
  if (fieldNames.length === 0) return errors;

  let sfFields: Field[];
  try {
    const describeResult = await conn.describe(sobject);
    sfFields = describeResult.fields;
  } catch {
    errors.push({
      field: "*",
      error: `Unable to validate fields: could not describe ${sobject} object in Salesforce. Check that the Salesforce connection is still active.`,
    });
    return errors;
  }

  const sfFieldMap = new Map<string, Field>();
  for (const f of sfFields) {
    sfFieldMap.set(f.name.toLowerCase(), f);
  }

  for (const fieldName of fieldNames) {
    const rawEntry = mappings[fieldName];
    const entry: WriteToBookingEntry | null = isWriteToBookingEntry(rawEntry)
      ? rawEntry
      : null;

    const sfField = sfFieldMap.get(fieldName.toLowerCase());

    if (!sfField) {
      errors.push({ field: fieldName, error: `Field "${fieldName}" does not exist on ${sobject}` });
      continue;
    }

    if (sfField.name !== fieldName) {
      errors.push({
        field: fieldName,
        error: `Field name case mismatch: use "${sfField.name}" instead of "${fieldName}"`,
      });
    }

    if (!sfField.updateable) {
      errors.push({ field: fieldName, error: `Field "${fieldName}" is read-only` });
      continue;
    }

    if (!entry) continue;

    if (entry.fieldType === SalesforceFieldType.CHECKBOX && sfField.type !== "boolean") {
      errors.push({
        field: fieldName,
        error: `Field "${fieldName}" is configured as Checkbox but is "${sfField.type}" in Salesforce`,
      });
    }

    if (entry.fieldType !== SalesforceFieldType.CHECKBOX && sfField.type === "boolean") {
      errors.push({
        field: fieldName,
        error: `Field "${fieldName}" is a Checkbox in Salesforce — select Checkbox type and use True/False`,
      });
    }

    if (
      entry.fieldType === SalesforceFieldType.PICKLIST &&
      sfField.type === "picklist" &&
      typeof entry.value === "string"
    ) {
      const activeValues = (sfField.picklistValues ?? [])
        .filter((pv) => pv.active)
        .map((pv) => pv.value);

      if (activeValues.length > 0 && !activeValues.includes(entry.value)) {
        const suggestion = activeValues.slice(0, 5).join(", ");
        const suffix = activeValues.length > 5 ? `, ... (${activeValues.length} total)` : "";
        errors.push({
          field: fieldName,
          error: `"${entry.value}" is not a valid picklist value for "${fieldName}". Valid values: ${suggestion}${suffix}`,
        });
      }
    }
  }

  return errors;
}
