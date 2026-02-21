import type { Field } from "@calcom/app-store/routing-forms/types/types";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { v4 as uuidv4 } from "uuid";

export type RoutingFormField = Field & {
  routerId?: string;
  routerField?: string;
  router?: string;
};

export type FormBuilderFieldOption = {
  label?: string;
  value?: string | null;
  price?: number;
};

export type FormBuilderField = {
  id: string;
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: FormBuilderFieldOption[];
  editable?: "user" | "user-readonly" | "system" | "system-but-optional";
  sources?: Array<{ id: string; type: string; label: string }>;
  hidden?: boolean;
  routerId?: string;
  routerField?: string;
  router?: string;
};

export const transformToBuilder = (
  fields: (RoutingFormField | undefined)[] | null | undefined,
  lockType?: boolean
): FormBuilderField[] => {
  if (!fields) return [];

  return fields
    .filter((f): f is RoutingFormField => f !== undefined)
    .map((f) => {
      const options = f.options?.map((o) => ({
        label: o.label,
        value: o.id === null ? null : (o.id ?? o.label),
      }));

      const field: FormBuilderField = {
        ...f,
        id: f.id,
        name: f.identifier || getFieldIdentifier(f.label),
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        placeholder: f.placeholder,
        options: options,
        editable: lockType ? "system-but-optional" : f.router ? "user-readonly" : "user",
        sources: [],
        hidden: false,
      };

      if (f.routerId) field.routerId = f.routerId;
      if (f.routerField) field.routerField = f.routerField;
      if (f.router) field.router = f.router;

      return field;
    });
};

export const transformToRouting = (
  fields: (FormBuilderField | undefined)[] | undefined,
  fieldIdMap: Map<string, string>,
  previousFields: RoutingFormField[] | null
): RoutingFormField[] => {
  if (!fields) return [];

  const validFields = fields.filter((f): f is FormBuilderField => f !== undefined && !!f.type);
  const previousFieldsMap = new Map((previousFields || []).map((f) => [f.id, f]));

  return validFields.map((f) => {
    const identifier = f.name || getFieldIdentifier(f.label || "");
    const fieldId = fieldIdMap.get(identifier) ?? (f.id || uuidv4());

    if (!fieldIdMap.has(identifier)) {
      fieldIdMap.set(identifier, fieldId);
    }

    const previousField = previousFieldsMap.get(fieldId);
    const routingField: RoutingFormField = {
      id: fieldId,
      label: f.label || "",
      identifier: identifier,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: f.options
        ?.filter((o): o is FormBuilderFieldOption => o !== undefined)
        .map((o) => ({
          label: o.label ?? "",
          id: o.value === null ? null : (o.value ?? ""),
        })),
    };

    if (previousField?.routerId || f.routerId) {
      routingField.routerId = previousField?.routerId || f.routerId;
    }
    if (previousField?.routerField || f.routerField) {
      routingField.routerField = previousField?.routerField || f.routerField;
    }
    if (previousField?.router || f.router) {
      routingField.router = previousField?.router || f.router;
    }

    return routingField;
  });
};
