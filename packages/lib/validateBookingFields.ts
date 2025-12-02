import type { z } from "zod";

import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type BookingField = z.infer<typeof eventTypeBookingFields>[number];

const VALID_PARENT_TYPES = ["radio", "select", "checkbox", "boolean", "multiselect"] as const;

export function validateBookingFields(fields: BookingField[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const fieldsByName = new Map(fields.map((f) => [f.name, f]));

  fields.forEach((field, index) => {
    if (!field.conditionalOn) return;

    const { parent, values } = field.conditionalOn;

    // Check parent exists
    const parentField = fieldsByName.get(parent);
    if (!parentField) {
      errors.push(`Field "${field.name}": Parent field "${parent}" does not exist`);
      return;
    }

    // Check parent comes before child (array order matters for rendering)
    const parentIndex = fields.findIndex((f) => f.name === parent);
    if (parentIndex >= index) {
      errors.push(
        `Field "${field.name}": Parent field "${parent}" must come before conditional field in the list`
      );
    }

    // Check parent is valid type
    if (!VALID_PARENT_TYPES.includes(parentField.type as (typeof VALID_PARENT_TYPES)[number])) {
      errors.push(
        `Field "${field.name}": Parent field "${parent}" has invalid type "${parentField.type}". Must be one of: ${VALID_PARENT_TYPES.join(", ")}`
      );
      return;
    }

    // Check for self-reference
    if (parent === field.name) {
      errors.push(`Field "${field.name}": Cannot be conditional on itself`);
    }

    // Check for circular dependencies (A→B, B→A)
    if (parentField.conditionalOn?.parent === field.name) {
      errors.push(`Field "${field.name}": Circular dependency detected with "${parent}"`);
    }

    // Check trigger values exist in parent's options
    if (parentField.type !== "boolean" && parentField.options) {
      const parentOptionValues = parentField.options.map((opt) => opt.value);
      const invalidValues = values.filter((v) => !parentOptionValues.includes(v));
      if (invalidValues.length > 0) {
        errors.push(
          `Field "${field.name}": Trigger values [${invalidValues.join(", ")}] not found in parent field options`
        );
      }
    }

    // For boolean parents, validate trigger values
    if (parentField.type === "boolean") {
      const invalidValues = values.filter((v) => v !== "true" && v !== "false");
      if (invalidValues.length > 0) {
        errors.push(
          `Field "${field.name}": Boolean parent only accepts "true" or "false" as trigger values`
        );
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
