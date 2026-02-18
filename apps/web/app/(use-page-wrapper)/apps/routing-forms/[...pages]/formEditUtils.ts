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
 * Returns true when the routing field is a linked-router field — i.e. it was
 * sourced from another routing form via the "link router" feature and carries
 * `routerId` metadata.
 *
 * Linked-router fields must be treated as fully locked (`editable: "system"`)
 * because:
 *   1. Their type and options are owned by the source router form; changes here
 *      would silently diverge from the source.
 *   2. Any identifier change would strip the `routerId` / `routerField` metadata
 *      on save, breaking the cross-form routing linkage.
 */
export function isRouterField(field: RoutingField): boolean {
  return "routerId" in field && Boolean((field as RoutingField & { routerId?: string }).routerId);
}

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
 *
 * Linked-router fields (those with a `routerId`) are always rendered with
 * `editable: "system"` regardless of `lockType`, because their schema is owned
 * by the source router form and must never be modified here.
 */
export function toFormBuilderField(field: RoutingField, lockType = false): FormBuilderField {
  const name = field.identifier
    ? field.identifier
    : getFieldIdentifier(field.label ?? "").toLowerCase();

  // Determine editability:
  //   - Router fields: fully locked ("system") — type AND identifier are immutable.
  //   - Fields with responses: type locked ("system-but-optional") — label/options editable.
  //   - Normal fields: fully editable ("user").
  let editable: FormBuilderField["editable"];
  if (isRouterField(field)) {
    // Linked-router fields are owned by the source router; lock everything.
    editable = "system";
  } else if (lockType) {
    // Form has existing responses — lock only the type selector.
    editable = "system-but-optional";
  } else {
    editable = "user";
  }

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
    editable,
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

/**
 * Applies the type-revert guard for a single FormBuilder field in the watch
 * subscription.
 *
 * When `hasResponses` is true and the field's identifier is present in
 * `originalTypes`, any type change is silently reverted to the original.
 * This is a defence-in-depth layer: `editable: "system-but-optional"` already
 * prevents the UI from offering the type selector, but this guard catches the
 * case where a future FormBuilder version might ignore the `editable` prop.
 *
 * Returns the original `bf` reference unchanged when no revert is needed
 * (avoids unnecessary object allocation in the hot path).
 *
 * @param bf            The FormBuilder field from the watch callback.
 * @param hasResponses  Whether the form has existing responses.
 * @param originalTypes Map of identifier → original type, initialised at mount.
 */
export function applyTypeRevertGuard(
  bf: FormBuilderField,
  hasResponses: boolean,
  originalTypes: ReadonlyMap<string, string>
): FormBuilderField {
  if (!hasResponses) return bf;
  const lockedType = originalTypes.get(bf.name);
  if (lockedType === undefined) return bf; // new field — no guard needed
  if (bf.type === lockedType) return bf; // type already matches — no-op
  return { ...bf, type: lockedType as FormBuilderField["type"] };
}
