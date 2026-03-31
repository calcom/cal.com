/* v8 ignore start */
import type { TableDefinition } from "../types";

export const userFeaturesTable: TableDefinition = {
  modelName: "UserFeatures",
  displayName: "User Feature",
  displayNamePlural: "User Features",
  description: "Feature flags assigned to individual users",
  slug: "user-features",
  category: "system",
  defaultSort: "assignedAt",
  defaultSortDirection: "desc",
  fields: [
    {
      column: "userId",
      label: "User ID",
      type: "number",
      access: "readonly",
      isPrimary: true,
      showInList: true,
    },
    {
      column: "featureId",
      label: "Feature Slug",
      type: "string",
      access: "readonly",
      isPrimary: true,
      searchable: true,
      showInList: true,
    },
    { column: "enabled", label: "Enabled", type: "boolean", access: "readonly", showInList: true },
    { column: "assignedAt", label: "Assigned At", type: "datetime", access: "readonly", showInList: true },
    { column: "assignedBy", label: "Assigned By", type: "string", access: "readonly", showInList: true },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly" },
    {
      column: "user",
      label: "User",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "User",
        select: { id: true, name: true, email: true },
        displayField: "{name} ({email})",
        linkTo: { slug: "users", paramField: "id" },
      },
    },
    {
      column: "feature",
      label: "Feature",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Feature",
        select: { slug: true, enabled: true, type: true },
        displayField: "slug",
        fkColumn: "featureId",
        linkTo: { slug: "features", paramField: "slug" },
      },
    },
  ],
};
