/**
 * Field Transformation Utilities for Routing Forms
 * 
 * This module provides conversion functions between Routing Form fields and Booking Fields,
 * enabling the reuse of FormBuilder components from event-types in routing forms.
 * 
 * @see https://github.com/calcom/cal.com/issues/18987
 */

import type { TNonRouterField, FieldOption, FieldOptionWithValue } from "@calcom/features/routing-forms/lib/zod";
import type { FieldType } from "@calcom/prisma/zod-utils";
import type { z } from "zod";
import type { fieldsSchema } from "@calcom/features/form-builder/schema";

// Type for FormBuilder field (from event-types/booking fields)
type FormBuilderField = z.infer<typeof fieldsSchema>[number];

// Type for FormBuilder field (from event-types/booking fields)
type FormBuilderField = z.infer<typeof fieldSchema>;

/**
 * Detects if an option is in the legacy format {label, id}
 */
function isLegacyOption(option: FieldOption | FieldOptionWithValue): option is FieldOption {
  return "id" in option && !("value" in option);
}

/**
 * Converts a routing form field option to FormBuilder format
 * Legacy format: {label, id} → New format: {label, value}
 */
export function transformOptionToFormBuilder(
  option: FieldOption | FieldOptionWithValue
): { label: string; value: string } {
  if (isLegacyOption(option)) {
    // Legacy format: use id as value (fall back to label if id is null)
    return {
      label: option.label,
      value: option.id || option.label,
    };
  }
  // Already in new format
  return {
    label: option.label,
    value: option.value,
  };
}

/**
 * Converts a FormBuilder option back to routing form format
 * New format: {label, value} → {label, id, value} (hybrid for compatibility)
 */
export function transformOptionToRoutingForm(
  option: { label: string; value: string }
): FieldOptionWithValue {
  return {
    label: option.label,
    value: option.value,
    id: option.value, // Store value as id for backward compatibility
  };
}

/**
 * Transforms a Routing Form field to FormBuilder field format
 * This enables using the event-types FormBuilder UI with routing forms
 */
export function transformRoutingFieldToFormBuilder(
  field: TNonRouterField
): FormBuilderField {
  const baseField = {
    name: field.identifier || field.id,
    type: field.type as FieldType,
    label: field.label,
    placeholder: field.placeholder,
    required: field.required ?? false,
    hidden: field.hidden ?? false,
    editable: field.editable || "user",
    sources: field.sources || [
      {
        id: "user",
        type: "user",
        label: "User",
      },
    ],
    disableOnPrefill: field.disableOnPrefill ?? false,
  };

  // Handle options transformation
  if (field.options && field.options.length > 0) {
    return {
      ...baseField,
      options: field.options.map(transformOptionToFormBuilder),
    } as FormBuilderField;
  }

  return baseField as FormBuilderField;
}

/**
 * Transforms a FormBuilder field back to Routing Form format
 * Preserves backward compatibility with existing routing form data
 */
export function transformFormBuilderToRoutingField(
  formBuilderField: FormBuilderField,
  existingField?: Partial<TNonRouterField>
): TNonRouterField {
  const field: TNonRouterField = {
    id: existingField?.id || formBuilderField.name,
    label: formBuilderField.label || existingField?.label || formBuilderField.name,
    identifier: formBuilderField.name,
    type: formBuilderField.type,
    placeholder: formBuilderField.placeholder,
    required: formBuilderField.required,
    hidden: formBuilderField.hidden,
    editable: formBuilderField.editable,
    sources: formBuilderField.sources,
    disableOnPrefill: formBuilderField.disableOnPrefill,
    // Preserve existing fields if provided
    ...existingField,
  };

  // Transform options back to routing form format
  if (formBuilderField.options && formBuilderField.options.length > 0) {
    field.options = formBuilderField.options.map(transformOptionToRoutingForm);
  }

  return field;
}

/**
 * Batch transforms an array of routing form fields to FormBuilder format
 */
export function transformRoutingFieldsToFormBuilder(
  fields: TNonRouterField[]
): FormBuilderField[] {
  return fields.map(transformRoutingFieldToFormBuilder);
}

/**
 * Batch transforms an array of FormBuilder fields back to routing form format
 */
export function transformFormBuilderToRoutingFields(
  formBuilderFields: FormBuilderField[],
  existingFields?: TNonRouterField[]
): TNonRouterField[] {
  return formBuilderFields.map((field, index) => {
    const existingField = existingFields?.find((f) => f.identifier === field.name || f.id === field.name);
    return transformFormBuilderToRoutingField(field, existingField);
  });
}

/**
 * Migration helper: Converts legacy routing form fields to the new format
 * This should be called when loading existing routing forms
 */
export function migrateRoutingField(field: TNonRouterField): TNonRouterField {
  // If options are in legacy format, convert them
  if (field.options && field.options.length > 0 && isLegacyOption(field.options[0])) {
    return {
      ...field,
      options: field.options.map((opt) => ({
        label: opt.label,
        value: (opt as FieldOption).id || opt.label,
        id: (opt as FieldOption).id,
      })),
    };
  }
  return field;
}

/**
 * Type guard to check if a field needs migration
 */
export function needsMigration(field: TNonRouterField): boolean {
  if (!field.options || field.options.length === 0) return false;
  return isLegacyOption(field.options[0]);
}
