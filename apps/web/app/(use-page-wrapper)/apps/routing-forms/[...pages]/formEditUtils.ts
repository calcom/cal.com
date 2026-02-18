/**
 * Shared adapter utilities for converting between routing-form field schema
 * and FormBuilder field schema.
 *
 * Extracted so that both the FormEdit component and its unit tests import the
 * real production implementations — preventing test drift from the actual code.
 */

import { v4 as uuidv4 } from "uuid";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import type { fieldsSchema } from "@calcom/features/form-builder/schema";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import type { z } from "zod";

export type RoutingField = NonNullable<RoutingFormWithResponseCount["fields"]>[number];
export type FormBuilderFields = z.infer<typeof fieldsSchema>;
export type FormBuilderField = FormBuilderFields[number];

/**
 * Convert a routing-form field → FormBuilder field.
 *
 * Mapping:
 *   routing `identifier` (or slugified `label`) → FormBuilder `name`
 *   routing `label`                              → FormBuilder `label`
 *   routing `type`                               → FormBuilder `type`
 *   routing `options[].id`                       → FormBuilder `options[].value`
 *
 * @param lockType - when true (form has existing responses), sets `editable:
 *   "system-but-optional"` so FormBuilder renders the type selector as read-only,
 *   matching the previous behaviour that disabled type changes on non-empty forms.
 */
export function toFormBuilderField(field: RoutingField, lockType = false): FormBuilderField {
  const name = field.identifier
    ? field.identifier
    : getFieldIdentifier(field.label ?? "").toLowerCase();

  return {
    name,
    label: field.label ?? "",
    type: (field.type ?? "text") as FormBuilderField["type"],
    required: field.required ?? false,
    placeholder: field.placeholder ?? "",
    options: field.options?.map((opt) => ({
      label: opt.label,
      value: opt.id ?? opt.label,
    })),
    // "system-but-optional" keeps the field editable for label/options/required
    // but locks the type selector — identical to the old `disableTypeChange` behaviour.
    editable: lockType ? "system-but-optional" : "user",
    sources: [
      {
        label: "User",
        type: "user" as const,
        id: "user",
        fieldRequired: field.required ?? false,
      },
    ],
  };
}

/**
 * Convert a FormBuilder field → routing-form field.
 *
 * Preserves the original `id` so RAQB conditions continue to work.
 * Also re-attaches any router-specific metadata (`routerId`, `router`,
 * `routerField`) from the original routing field so that linked-router
 * fields are not silently stripped on save.
 */
export function toRoutingField(
  builderField: FormBuilderField,
  originalId?: string,
  originalRoutingField?: RoutingField
): RoutingField {
  const bf = builderField as FormBuilderField & {
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[];
  };

  const base = {
    id: originalId ?? uuidv4(),
    label: bf.label ?? bf.name,
    identifier: bf.name,
    type: bf.type,
    required: bf.required ?? false,
    placeholder: bf.placeholder ?? "",
    options: bf.options?.map((opt) => ({ label: opt.label, id: opt.value })),
  };

  // Preserve router-field metadata (routerId / router / routerField) from the
  // original routing field.  Without this, editing and saving a form that
  // contains linked-router fields silently strips the router association,
  // causing the form to lose its cross-form routing logic.
  if (originalRoutingField && "routerId" in originalRoutingField) {
    const { routerId, router, routerField } = originalRoutingField as RoutingField & {
      routerId: string;
      router?: unknown;
      routerField?: unknown;
    };
    return {
      ...base,
      routerId,
      ...(router !== undefined && { router }),
      ...(routerField !== undefined && { routerField }),
    } as RoutingField;
  }

  return base as RoutingField;
}
