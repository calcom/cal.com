/**
 * Routing Forms to FormBuilder Adapter
 * 
 * This adapter maps routing form fields to FormBuilder fields.
 * Provides compatibility between the old routing forms system and the new FormBuilder.
 */

import type { Field } from "./types";

export interface FormBuilderField {
  id: string;
  type: string;
  label: string;
  identifier: string;
  required: boolean;
  options?: { label: string; value: string }[];
}

/**
 * Convert a routing form field to FormBuilder format
 */
export function routingFieldToFormBuilder(field: Field): FormBuilderField {
  return {
    id: field.id,
    type: mapFieldType(field.type),
    label: field.label,
    identifier: field.identifier || field.id,
    required: field.required || false,
    options: field.options as FormBuilderField["options"],
  };
}

/**
 * Map routing form field types to FormBuilder types
 */
function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    text: "text",
    textarea: "text",
    number: "number",
    select: "select",
    multiselect: "multiselect",
    radio: "radio",
    checkbox: "checkbox",
    email: "email",
    url: "url",
    phone: "phone",
    date: "date",
    datetime: "datetime",
  };
  return typeMap[type] || "text";
}

/**
 * Convert FormBuilder field to routing form format
 */
export function formBuilderFieldToRouting(field: FormBuilderField): Partial<Field> {
  return {
    id: field.id,
    type: field.type,
    label: field.label,
    identifier: field.identifier,
    required: field.required,
    options: field.options as any,
  };
}

/**
 * Check if a routing form field can be converted to FormBuilder
 */
export function isFieldCompatible(field: Field): boolean {
  const supportedTypes = [
    "text",
    "textarea", 
    "number",
    "select",
    "multiselect",
    "radio",
    "checkbox",
    "email",
    "url",
    "phone",
    "date",
    "datetime",
  ];
  return supportedTypes.includes(field.type);
}
