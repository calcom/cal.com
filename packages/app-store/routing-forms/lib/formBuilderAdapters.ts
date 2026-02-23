import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { v4 as uuidv4 } from "uuid";
import type { Field } from "../types/types";

/**
 * Minimal shape for a field as used by FormBuilder (event-type booking questions).
 * FormBuilder may omit router metadata when editing; we merge it back in transformToRouting.
 * label and other props are optional to match what react-hook-form / FormBuilder actually pass.
 */
/** Option shape as stored by the form (optional props and elements for compatibility with react-hook-form) */
export type FormBuilderFieldOption = {
  label?: string;
  value?: string | null;
};

export type FormBuilderField = {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: (FormBuilderFieldOption | undefined)[];
  editable?: "user" | "user-readonly" | "system" | "system-but-optional";
  sources?: ({ label?: string; type?: string; id?: string; fieldRequired?: boolean } | undefined)[];
  hidden?: boolean;
  /** Preserved when present (router fields); merged back in transformToRouting if dropped by FormBuilder */
  routerId?: string;
  routerField?: Field;
  router?: { name: string; description: string; id: string };
};

/**
 * Permissive shape accepted from form state (e.g. builderForm.watch()).
 * Nested properties and array elements are optional so react-hook-form / FormBuilder values are assignable.
 */
export type FormBuilderFieldInput = Omit<FormBuilderField, "routerField" | "router"> & {
  routerField?: {
    id?: string;
    type?: string;
    label?: string;
    identifier?: string;
    placeholder?: string;
    selectText?: string;
    required?: boolean;
    deleted?: boolean;
    options?: ({ id?: string | null; label?: string } | undefined)[];
    routerId?: string;
    routerField?: unknown;
    router?: { name?: string; description?: string; id?: string };
  };
  router?: { name?: string; description?: string; id?: string };
};

export type RoutingField = Field;

/**
 * Convert routing form fields to FormBuilder shape.
 * Uses identifier or slugified label for `name` so the ID map key is stable.
 *
 * @param lockType - when true (form has existing responses), sets editable to "system-but-optional" so type cannot be changed
 */
export function transformToBuilder(fields: RoutingField[] | undefined, lockType = false): FormBuilderField[] {
  return (fields || []).map((f) => {
    const name = f.identifier || getFieldIdentifier(f.label ?? "").toLowerCase();
    const options = f.options?.map((o) => ({
      label: o.label,
      value: o.id === null ? null : (o.id ?? o.label),
    }));

    const field: FormBuilderField = {
      ...f,
      id: f.id,
      name,
      label: f.label ?? "",
      type: f.type ?? "text",
      required: f.required ?? false,
      placeholder: f.placeholder ?? "",
      options,
      editable: (f as RoutingField & { router?: unknown }).router
        ? "user-readonly"
        : lockType
          ? "system-but-optional"
          : "user",
      sources: [
        {
          label: "User",
          type: "user",
          id: "user",
          fieldRequired: f.required ?? false,
        },
      ],
      hidden: false,
    };
    return field;
  });
}

export type TransformToRoutingOptions = {
  /** Previous parent fields; used to preserve router/routerField/routerId when FormBuilder drops them */
  previousParentFields?: RoutingField[];
  /** When true, field types are reverted to originalTypeRegistry values to prevent invalidating stored data */
  hasResponses?: boolean;
  /** Map identifier (name) -> original type; used when hasResponses to lock type */
  originalTypeRegistry?: Map<string, string>;
};

/**
 * Convert FormBuilder fields back to routing form shape.
 * Uses fieldIdMap (keyed by identifier/name) to preserve stable IDs across reorder/rename.
 * New fields get a UUID and are stored in the map by current name.
 */
export function transformToRouting(
  builderFields: (FormBuilderFieldInput | undefined)[],
  fieldIdMap: Map<string, string>,
  options: TransformToRoutingOptions = {}
): RoutingField[] {
  const { previousParentFields = [], hasResponses = false, originalTypeRegistry } = options;

  const previousById = new Map(previousParentFields.map((f) => [f.id, f]));

  const definedFields = builderFields.filter(
    (f): f is FormBuilderFieldInput =>
      f != null && typeof f === "object" && (f.name != null || f.label != null)
  );

  return definedFields.map((f) => {
    const name = f.name ?? f.label ?? "";
    let fieldId = fieldIdMap.get(name) ?? f.id;
    if (!fieldId) {
      fieldId = uuidv4();
      fieldIdMap.set(name, fieldId);
    } else if (!fieldIdMap.has(name)) {
      fieldIdMap.set(name, fieldId);
    }

    let resolvedType = f.type ?? "text";
    if (hasResponses && originalTypeRegistry?.has(name)) {
      const lockedType = originalTypeRegistry.get(name)!;
      if (resolvedType !== lockedType) {
        resolvedType = lockedType;
      }
    }

    const previous = previousById.get(fieldId);
    const routerId = previous && "routerId" in previous ? previous.routerId : f.routerId;
    const routerField = previous && "routerField" in previous ? previous.routerField : f.routerField;
    const router = previous && "router" in previous ? previous.router : f.router;

    const routing: RoutingField = {
      id: fieldId,
      label: f.label ?? name,
      identifier: name,
      type: resolvedType,
      required: f.required ?? false,
      placeholder: f.placeholder ?? "",
      options: f.options?.filter((o): o is FormBuilderFieldOption => o != null).map((o) => ({
        label: o.label ?? "",
        id: o.value === null ? null : (o.value ?? ""),
      })),
    } as RoutingField;

    if (routerId !== undefined) {
      (routing as RoutingField & { routerId: string }).routerId = routerId;
    }
    if (routerField !== undefined) {
      (routing as RoutingField & { routerField: Field }).routerField = routerField as Field;
    }
    if (router !== undefined) {
      (routing as RoutingField & { router: { name: string; description: string; id: string } }).router =
        router as { name: string; description: string; id: string };
    }

    return routing;
  });
}
