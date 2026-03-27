/* v8 ignore start */
import type { TableDefinition } from "../types";
export const featureTable: TableDefinition = {
  modelName: "Feature",
  displayName: "Feature Flag",
  displayNamePlural: "Feature Flags",
  description: "Feature flags and toggles",
  slug: "features",
  category: "system",
  defaultSort: "slug",
  defaultSortDirection: "asc",
  fields: [
    { column: "slug", label: "Slug", type: "string", access: "readonly", isPrimary: true, searchable: true, showInList: true },
    { column: "enabled", label: "Enabled", type: "boolean", access: "readonly", showInList: true },
    { column: "description", label: "Description", type: "string", access: "readonly", showInList: true },
    { column: "type", label: "Type", type: "enum", access: "readonly", enumValues: ["RELEASE", "EXPERIMENT", "OPERATIONAL", "KILL_SWITCH", "PERMISSION"], showInList: true },
    { column: "stale", label: "Stale", type: "boolean", access: "readonly" },
    { column: "lastUsedAt", label: "Last Used", type: "datetime", access: "readonly" },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly" },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly" },
    { column: "updatedBy", label: "Updated By (ID)", type: "number", access: "readonly" },
  ],
  actions: [
    {
      id: "enable-flag",
      label: "Enable",
      icon: "check",
      variant: "default",
      mutation: "admin.toggleFeatureFlag",
      buildInput: (row) => ({ slug: row.slug, enabled: true }),
      condition: (row) => row.enabled === false,
    },
    {
      id: "disable-flag",
      label: "Disable",
      icon: "ban",
      variant: "destructive",
      mutation: "admin.toggleFeatureFlag",
      buildInput: (row) => ({ slug: row.slug, enabled: false }),
      condition: (row) => row.enabled === true,
      confirm: { title: "Disable this feature flag?", description: "This may affect users who depend on this feature." },
    },
  ],
};
