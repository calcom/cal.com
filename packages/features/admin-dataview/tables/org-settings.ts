/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const orgSettingsTable: TableDefinition = {
  modelName: "OrganizationSettings",
  displayName: "Org Settings",
  displayNamePlural: "Org Settings",
  description: "Configuration for organizations",
  slug: "org-settings",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "organizationId", label: "Org ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "isOrganizationConfigured", label: "Configured", type: "boolean", access: "readonly", showInList: true },
    { column: "isOrganizationVerified", label: "Verified", type: "boolean", access: "readonly", showInList: true },
    { column: "isAdminReviewed", label: "Admin Reviewed", type: "boolean", access: "readonly", showInList: true },
    { column: "orgAutoAcceptEmail", label: "Auto-Accept Domain", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "lockEventTypeCreationForUsers", label: "Lock Event Creation", type: "boolean", access: "readonly" },
    { column: "adminGetsNoSlotsNotification", label: "No-Slots Notification", type: "boolean", access: "readonly" },
    { column: "isAdminAPIEnabled", label: "Admin API", type: "boolean", access: "readonly" },
    { column: "allowSEOIndexing", label: "SEO Indexing", type: "boolean", access: "readonly" },
    { column: "orgProfileRedirectsToVerifiedDomain", label: "Domain Redirect", type: "boolean", access: "readonly" },
    { column: "orgAutoJoinOnSignup", label: "Auto Join", type: "boolean", access: "readonly" },

    {
      column: "organization",
      label: "Organization",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Team",
        select: { id: true, name: true, slug: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
  ],
};
