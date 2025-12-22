import type { z } from "zod";

import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type BookingField = z.infer<typeof eventTypeBookingFields>[number];

/**
 * Determines if a field should be visible based on conditional logic
 * @param field - The field to check
 * @param responses - Current form responses
 * @returns true if field should be visible, false otherwise
 */
export function isFieldConditionallyVisible(
  field: BookingField,
  responses: Record<string, unknown>
): boolean {
  // If field has no conditional configuration, it's always visible
  if (!field.conditionalOn) {
    return true;
  }

  const { parentFieldName, showWhenParentValues } = field.conditionalOn;

  // Get the parent field's current value
  const parentValue = responses[parentFieldName];

  // If parent field hasn't been answered yet, hide this field
  if (parentValue === undefined || parentValue === null) {
    return false;
  }

  // Empty string or empty array should be treated as unanswered
  if (typeof parentValue === "string" && parentValue === "") {
    return false;
  }

  if (Array.isArray(parentValue) && parentValue.length === 0) {
    return false;
  }

  // Normalize showWhenParentValues to array for easier comparison
  const expectedValues = Array.isArray(showWhenParentValues)
    ? showWhenParentValues.map(String)
    : [String(showWhenParentValues)];

  // Normalize parent value(s) to array for comparison
  const parentValues = Array.isArray(parentValue) ? parentValue : [parentValue];

  // Check if any parent value matches any expected value
  return parentValues.some((value) => expectedValues.includes(String(value)));
}

/**
 * Gets all fields that should be visible based on current responses
 * @param fields - All booking fields
 * @param responses - Current form responses
 * @returns Array of fields that should be visible
 */
export function getVisibleFields(
  fields: BookingField[],
  responses: Record<string, unknown>
): BookingField[] {
  return fields.filter((field) => isFieldConditionallyVisible(field, responses));
}

/**
 * Validates that conditional field dependencies are properly configured
 * @param fields - All booking fields
 * @returns Array of validation errors, empty if valid
 */
export function validateConditionalFields(fields: BookingField[]): string[] {
  const errors: string[] = [];
  const fieldNames = new Set(fields.map((f) => f.name));

  fields.forEach((field) => {
    if (field.conditionalOn) {
      const { parentFieldName, showWhenParentValues } = field.conditionalOn;

      // Check if parent field exists
      if (!fieldNames.has(parentFieldName)) {
        errors.push(
          `Field "${field.name}" references non-existent parent field "${parentFieldName}"`
        );
      }

      // Check if parent is not itself
      if (parentFieldName === field.name) {
        errors.push(`Field "${field.name}" cannot be conditional on itself`);
      }

      // Validate showWhenParentValues is not empty
      const values = Array.isArray(showWhenParentValues)
        ? showWhenParentValues
        : [showWhenParentValues];

      if (values.length === 0) {
        errors.push(`Field "${field.name}" has empty showWhenParentValues`);
      }

      // Check for circular dependencies (basic check - can be enhanced)
      const parentField = fields.find((f) => f.name === parentFieldName);
      if (parentField?.conditionalOn?.parentFieldName === field.name) {
        errors.push(
          `Circular dependency detected between "${field.name}" and "${parentFieldName}"`
        );
      }
    }
  });

  return errors;
}
