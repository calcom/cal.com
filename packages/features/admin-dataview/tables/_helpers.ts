import type { FieldDefinition } from "../types";

export function id(overrides?: Partial<FieldDefinition>): FieldDefinition {
  return {
    column: "id",
    label: "ID",
    type: "number",
    access: "readonly",
    isPrimary: true,
    showInList: true,
    ...overrides,
  };
}

export function uuid(column = "uuid"): FieldDefinition {
  return { column, label: "UUID", type: "string", access: "readonly", showInList: false };
}

export function timestamps(): FieldDefinition[] {
  return [
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly", showInList: true },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly", showInList: false },
  ];
}
