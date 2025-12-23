export enum Resource {
  All = "*",
  EventType = "eventType",
  Team = "team",
  Organization = "organization",
  Attributes = "organization.attributes",
  Booking = "booking",
  Insights = "insights",
  Role = "role",
  RoutingForm = "routingForm",
  Workflow = "workflow",
  Webhook = "webhook",
  Availability = "availability",
  OutOfOffice = "ooo",
  Watchlist = "watchlist",
}

export enum CrudAction {
  All = "*",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
}

export enum CustomAction {
  Invite = "invite",
  Remove = "remove",
  ChangeMemberRole = "changeMemberRole",
  ListMembers = "listMembers",
  ListMembersPrivate = "listMembersPrivate",
  ManageBilling = "manageBilling",
  ReadTeamBookings = "readTeamBookings",
  ReadOrgBookings = "readOrgBookings",
  ReadRecordings = "readRecordings",
  Impersonate = "impersonate",
  EditUsers = "editUsers",
  ReadTeamAuditLogs = "readTeamAuditLogs",
  ReadOrgAuditLogs = "readOrgAuditLogs",
}

export enum Scope {
  Team = "team",
  Organization = "organization",
}

export interface PermissionDetails {
  description: string;
  category: string;
  i18nKey: string;
  descriptionI18nKey: string;
  scope?: Scope[]; // Optional for backward compatibility
  dependsOn?: PermissionString[]; // Dependencies that must be enabled when this permission is enabled
  visibleWhen?: {
    teamPrivacy?: "private" | "public" | "both"; // Control visibility based on team privacy setting
  };
}

export type ResourceConfig = {
  _resource?: {
    i18nKey: string;
  };
} & {
  [key in CrudAction | CustomAction]?: PermissionDetails;
};

export type PermissionRegistry = {
  [key in Resource]: ResourceConfig;
};

export type PermissionString = `${Resource}.${CrudAction | CustomAction}`;

/**
 * Parsed permission object containing resource and action parts
 */
export interface ParsedPermission {
  resource: string;
  action: string;
}

/**
 * Parses a permission string into its resource and action components
 * @param permission The permission string to parse
 * @returns Parsed permission object with resource and action
 */
export const parsePermissionString = (permission: string): ParsedPermission => {
  const lastDotIndex = permission.lastIndexOf(".");
  const resource = permission.substring(0, lastDotIndex);
  const action = permission.substring(lastDotIndex + 1);
  return { resource, action };
};

/**
 * Validates a permission string format
 * @param val The permission string to validate
 * @returns True if valid, false otherwise
 */
export const isValidPermissionString = (val: unknown): val is PermissionString => {
  if (typeof val !== "string") return false;

  // Handle special case for _resource
  if (val.endsWith("._resource")) {
    const resourcePart = val.slice(0, -10); // Remove "._resource"
    return Object.values(Resource).includes(resourcePart as Resource);
  }

  // Split by the last dot to handle nested resources like "organization.attributes.create"
  const lastDotIndex = val.lastIndexOf(".");
  if (lastDotIndex === -1) return false;

  const { resource, action } = parsePermissionString(val);

  const isValidResource = Object.values(Resource).includes(resource as Resource);
  const isValidAction =
    Object.values(CrudAction).includes(action as CrudAction) ||
    Object.values(CustomAction).includes(action as CustomAction);

  return isValidResource && isValidAction;
};

/**
 * Helper function to filter out the _resource property from a ResourceConfig
 * @param config The ResourceConfig to filter
 * @returns A new object without the _resource property
 */
export const filterResourceConfig = (config: ResourceConfig): Omit<ResourceConfig, "_resource"> => {
  const { _resource, ...rest } = config;
  return rest;
};

/**
 * Filter resources and actions based on scope and optionally team privacy settings
 * @param scope The scope to filter by (Team or Organization)
 * @param isPrivate Whether the team/organization is private (optional)
 * @returns Filtered permission registry
 */
export const getPermissionsForScope = (scope: Scope, isPrivate?: boolean): PermissionRegistry => {
  const filteredRegistry: Partial<PermissionRegistry> = {};
  const teamPrivacy = isPrivate !== undefined ? (isPrivate ? "private" : "public") : undefined;

  Object.entries(PERMISSION_REGISTRY).forEach(([resource, config]) => {
    const filteredConfig: ResourceConfig = { _resource: config._resource };

    Object.entries(config).forEach(([action, details]) => {
      if (action === "_resource") return;

      const permissionDetails = details as PermissionDetails;

      // Check scope
      const scopeMatches = !permissionDetails.scope || permissionDetails.scope.includes(scope);

      // Check privacy visibility (only if isPrivate is provided)
      const privacyMatches =
        teamPrivacy === undefined ||
        !permissionDetails.visibleWhen?.teamPrivacy ||
        permissionDetails.visibleWhen.teamPrivacy === "both" ||
        permissionDetails.visibleWhen.teamPrivacy === teamPrivacy;

      if (scopeMatches && privacyMatches) {
        filteredConfig[action as CrudAction | CustomAction] = permissionDetails;
      }
    });

    // Only include resource if it has at least one action for this scope
    const hasActions = Object.keys(filteredConfig).length > 1; // > 1 because _resource is always there
    if (hasActions) {
      filteredRegistry[resource as Resource] = filteredConfig;
    }
  });

  return filteredRegistry as PermissionRegistry;
};

export const getAllPermissionStringsForScope = (scope: Scope): PermissionString[] => {
  const registry = getPermissionsForScope(scope);
  return Object.entries(registry).flatMap(([resource, config]) =>
    Object.keys(config)
      .filter((k) => k !== "_resource")
      .map((action) => `${resource}.${action}` as PermissionString)
  );
};

const getPermissionSetForScope = (scope: Scope): Set<PermissionString> => {
  return new Set(getAllPermissionStringsForScope(scope));
};

export const isValidPermissionStringForScope = (val: unknown, scope: Scope): val is PermissionString => {
  if (!isValidPermissionString(val)) return false;
  const allowed = getPermissionSetForScope(scope);
  return allowed.has(val as PermissionString);
};

// Keep in mind these are on a team/organization level, not a user level
export const PERMISSION_REGISTRY: PermissionRegistry = {
  [Resource.All]: {
    _resource: {
      i18nKey: "pbac_resource_all",
    },
    [CrudAction.All]: {
      description: "All actions on all resources",
      category: "system",
      i18nKey: "pbac_resource_all",
      descriptionI18nKey: "pbac_desc_all_actions_all_resources",
      scope: [Scope.Organization], // Only organizations should have "All" permissions
    },
  },
  [Resource.Role]: {
    _resource: {
      i18nKey: "pbac_resource_role",
    },
    [CrudAction.Create]: {
      description: "Create roles",
      category: "role",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_roles",
      dependsOn: ["role.read"],
    },
    [CrudAction.Read]: {
      description: "View roles",
      category: "role",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_roles",
    },
    [CrudAction.Update]: {
      description: "Update roles",
      category: "role",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_roles",
      dependsOn: ["role.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete roles",
      category: "role",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_roles",
      dependsOn: ["role.read"],
    },
  },
  [Resource.EventType]: {
    _resource: {
      i18nKey: "pbac_resource_event_type",
    },
    [CrudAction.Create]: {
      description: "Create event types",
      category: "event",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_event_types",
      dependsOn: ["eventType.read"],
    },
    [CrudAction.Read]: {
      description: "View event types",
      category: "event",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_event_types",
    },
    [CrudAction.Update]: {
      description: "Update event types",
      category: "event",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_event_types",
      dependsOn: ["eventType.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete event types",
      category: "event",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_event_types",
      dependsOn: ["eventType.read"],
    },
  },
  [Resource.Team]: {
    _resource: {
      i18nKey: "pbac_resource_team",
    },
    [CrudAction.Create]: {
      description: "Create teams",
      category: "team",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_teams",
      scope: [Scope.Organization],
      dependsOn: ["team.read"],
    },
    [CrudAction.Read]: {
      description: "View team details",
      category: "team",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_team_details",
    },
    [CrudAction.Update]: {
      description: "Update settings",
      category: "team",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_team_settings",
      dependsOn: ["team.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete team",
      category: "team",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_team",
      dependsOn: ["team.read"],
    },
    [CustomAction.Invite]: {
      description: "Invite team members",
      category: "team",
      i18nKey: "pbac_action_invite",
      descriptionI18nKey: "pbac_desc_invite_team_members",
      dependsOn: ["team.read", "team.listMembers", "role.read"],
    },
    [CustomAction.Remove]: {
      description: "Remove team members",
      category: "team",
      i18nKey: "pbac_action_remove",
      descriptionI18nKey: "pbac_desc_remove_team_members",
      dependsOn: ["team.read", "team.listMembers"],
    },
    [CustomAction.ListMembers]: {
      description: "List team members",
      category: "team",
      i18nKey: "pbac_action_list_members",
      descriptionI18nKey: "pbac_desc_list_team_members",
      dependsOn: ["team.read"],
      visibleWhen: {
        teamPrivacy: "public", // Only show for public teams
      },
    },
    [CustomAction.ListMembersPrivate]: {
      description: "List private team members",
      category: "team",
      i18nKey: "pbac_action_list_members", // Use same UI label as listMembers for consistency
      descriptionI18nKey: "pbac_desc_list_team_members", // Use same description as listMembers
      dependsOn: ["team.read"],
      visibleWhen: {
        teamPrivacy: "private", // Only show for private teams
      },
    },
    [CustomAction.ChangeMemberRole]: {
      description: "Change role of team members",
      category: "team",
      i18nKey: "pbac_action_change_member_role",
      descriptionI18nKey: "pbac_desc_change_team_member_role",
      dependsOn: ["team.read", "team.listMembers", "role.read"],
    },
    [CustomAction.Impersonate]: {
      description: "Impersonate team members",
      category: "team",
      i18nKey: "pbac_action_impersonate",
      descriptionI18nKey: "pbac_desc_impersonate_team_members",
      dependsOn: ["team.read", "team.listMembers"],
    },
    [CustomAction.ManageBilling]: {
      description: "Manage billing",
      category: "team",
      i18nKey: "pbac_action_manage_billing",
      descriptionI18nKey: "pbac_desc_manage_billing",
      scope: [], // Empty scope because this permission is only used for TEAM billing outside of an org. (We dont want to show this in the UI)
    },
  },
  [Resource.Organization]: {
    _resource: {
      i18nKey: "pbac_resource_organization",
    },
    [CrudAction.Create]: {
      description: "Create organization",
      category: "org",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_organization",
      scope: [Scope.Organization],
    },
    [CrudAction.Read]: {
      description: "View organization details",
      category: "org",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_organization_details",
      scope: [Scope.Organization],
    },
    [CustomAction.ListMembers]: {
      description: "List organization members",
      category: "org",
      i18nKey: "pbac_action_list_members",
      descriptionI18nKey: "pbac_desc_list_organization_members",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
      visibleWhen: {
        teamPrivacy: "public", // Only show for public orgs
      },
    },
    [CustomAction.ListMembersPrivate]: {
      description: "List private organization members",
      category: "org",
      i18nKey: "pbac_action_list_members", // Same UI label as listMembers for consistency
      descriptionI18nKey: "pbac_desc_list_organization_members", // Same description as listMembers
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
      visibleWhen: {
        teamPrivacy: "private", // Only show for private orgs
      },
    },
    [CustomAction.Invite]: {
      description: "Invite organization members",
      category: "org",
      i18nKey: "pbac_action_invite",
      descriptionI18nKey: "pbac_desc_invite_organization_members",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers"],
    },
    [CustomAction.Remove]: {
      description: "Remove organization members",
      category: "org",
      i18nKey: "pbac_action_remove",
      descriptionI18nKey: "pbac_desc_remove_organization_members",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers"],
    },
    [CustomAction.ManageBilling]: {
      description: "Manage organization billing",
      category: "org",
      i18nKey: "pbac_action_manage_billing",
      descriptionI18nKey: "pbac_desc_manage_organization_billing",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
    },
    [CustomAction.ChangeMemberRole]: {
      description: "Change role of team members",
      category: "org",
      i18nKey: "pbac_action_change_member_role",
      descriptionI18nKey: "pbac_desc_change_organization_member_role",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers", "role.read"],
    },
    [CustomAction.Impersonate]: {
      description: "Impersonate organization members",
      category: "org",
      i18nKey: "pbac_action_impersonate",
      descriptionI18nKey: "pbac_desc_impersonate_organization_members",
      scope: [Scope.Organization],
    },
    [CrudAction.Update]: {
      description: "Edit organization settings",
      category: "org",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_edit_organization_settings",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
    },
  },
  [Resource.Booking]: {
    _resource: {
      i18nKey: "pbac_resource_booking",
    },
    [CrudAction.Read]: {
      description: "View bookings",
      category: "booking",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_bookings",
    },
    [CustomAction.ReadTeamBookings]: {
      description: "View team bookings",
      category: "booking",
      i18nKey: "pbac_action_read_team_bookings",
      descriptionI18nKey: "pbac_desc_view_team_bookings",
      scope: [Scope.Team],
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadOrgBookings]: {
      description: "View organization bookings",
      category: "booking",
      i18nKey: "pbac_action_read_org_bookings",
      descriptionI18nKey: "pbac_desc_view_organization_bookings",
      scope: [Scope.Organization],
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadRecordings]: {
      description: "View booking recordings",
      category: "booking",
      i18nKey: "pbac_action_read_recordings",
      descriptionI18nKey: "pbac_desc_view_booking_recordings",
      dependsOn: ["booking.read"],
    },
    [CrudAction.Update]: {
      description: "Update bookings",
      category: "booking",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_bookings",
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadTeamAuditLogs]: {
      description: "View team booking audit logs",
      category: "booking",
      i18nKey: "pbac_action_read_team_audit_logs",
      descriptionI18nKey: "pbac_desc_view_team_booking_audit_logs",
      scope: [Scope.Team],
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadOrgAuditLogs]: {
      description: "View organization booking audit logs",
      category: "booking",
      i18nKey: "pbac_action_read_org_audit_logs",
      descriptionI18nKey: "pbac_desc_view_organization_booking_audit_logs",
      scope: [Scope.Organization],
      dependsOn: ["booking.read"],
    },
  },
  [Resource.Insights]: {
    _resource: {
      i18nKey: "pbac_resource_insights",
    },
    [CrudAction.Read]: {
      description: "View team insights and analytics",
      category: "insights",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_team_insights",
    },
  },
  [Resource.Workflow]: {
    _resource: {
      i18nKey: "pbac_resource_workflow",
    },
    [CrudAction.Create]: {
      description: "Create workflows",
      category: "workflow",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_workflows",
      dependsOn: ["workflow.read"],
    },
    [CrudAction.Read]: {
      description: "View workflows",
      category: "workflow",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_workflows",
    },
    [CrudAction.Update]: {
      description: "Update workflows",
      category: "workflow",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_workflows",
      dependsOn: ["workflow.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete workflows",
      category: "workflow",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_workflows",
      dependsOn: ["workflow.read"],
    },
  },
  [Resource.Attributes]: {
    _resource: {
      i18nKey: "pbac_resource_attributes",
    },
    [CrudAction.Read]: {
      description: "View organization attributes",
      category: "attributes",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_organization_attributes",
      scope: [Scope.Organization],
    },
    [CrudAction.Update]: {
      description: "Update organization attributes",
      category: "attributes",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_organization_attributes",
      scope: [Scope.Organization],
      dependsOn: ["organization.attributes.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete organization attributes",
      category: "attributes",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_organization_attributes",
      scope: [Scope.Organization],
      dependsOn: ["organization.attributes.read"],
    },
    [CrudAction.Create]: {
      description: "Create organization attributes",
      category: "attributes",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_organization_attributes",
      scope: [Scope.Organization],
      dependsOn: ["organization.attributes.read"],
    },
    [CustomAction.EditUsers]: {
      description: "Edit user attributes",
      category: "attributes",
      i18nKey: "pbac_action_edit_users",
      descriptionI18nKey: "pbac_desc_edit_user_attributes",
      scope: [Scope.Organization],
      dependsOn: [
        "organization.read",
        "organization.listMembers",
        "organization.attributes.read",
        "organization.attributes.update",
        "organization.attributes.delete",
        "organization.attributes.create",
        "organization.changeMemberRole",
      ],
    },
  },
  [Resource.RoutingForm]: {
    _resource: {
      i18nKey: "pbac_resource_routing_form",
    },
    [CrudAction.Create]: {
      description: "Create routing forms",
      category: "routing",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_routing_forms",
      dependsOn: ["routingForm.read"],
    },
    [CrudAction.Read]: {
      description: "View routing forms",
      category: "routing",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_routing_forms",
    },
    [CrudAction.Update]: {
      description: "Update routing forms",
      category: "routing",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_routing_forms",
      dependsOn: ["routingForm.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete routing forms",
      category: "routing",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_routing_forms",
      dependsOn: ["routingForm.read"],
    },
  },
  [Resource.Webhook]: {
    _resource: {
      i18nKey: "pbac_resource_webhook",
    },
    [CrudAction.Create]: {
      description: "Create webhooks",
      category: "webhook",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_webhooks",
      dependsOn: ["webhook.read"],
    },
    [CrudAction.Read]: {
      description: "View webhooks",
      category: "webhook",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_webhooks",
    },
    [CrudAction.Update]: {
      description: "Update webhooks",
      category: "webhook",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_webhooks",
      dependsOn: ["webhook.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete webhooks",
      category: "webhook",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_webhooks",
      dependsOn: ["webhook.read"],
    },
  },
  [Resource.Availability]: {
    _resource: {
      i18nKey: "pbac_resource_availability",
    },
    [CrudAction.Create]: {
      description: "Create availability",
      category: "availability",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_availability",
      scope: [],
      dependsOn: ["availability.read"],
    },
    [CrudAction.Read]: {
      description: "View availability",
      category: "availability",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_availability",
      scope: [],
    },
    [CrudAction.Update]: {
      description: "Update availability",
      category: "availability",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_availability",
      scope: [],
      dependsOn: ["availability.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete availability",
      category: "availability",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_availability",
      scope: [],
      dependsOn: ["availability.read"],
    },
  },
  [Resource.OutOfOffice]: {
    _resource: {
      i18nKey: "pbac_resource_out_of_office",
    },
    [CrudAction.Create]: {
      description: "Create out of office",
      category: "ooo",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_out_of_office",
      scope: [],
      dependsOn: ["ooo.read"],
    },
    [CrudAction.Read]: {
      description: "View out of office",
      category: "ooo",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_out_of_office",
      scope: [],
    },
    [CrudAction.Update]: {
      description: "Update out of office",
      category: "ooo",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_out_of_office",
      scope: [],
      dependsOn: ["ooo.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete out of office",
      category: "ooo",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_out_of_office",
      scope: [],
      dependsOn: ["ooo.read"],
    },
  },
  [Resource.Watchlist]: {
    _resource: {
      i18nKey: "pbac_resource_blocklist",
    },
    [CrudAction.Create]: {
      description: "Create watchlist entries",
      category: "watchlist",
      i18nKey: "pbac_action_create",
      descriptionI18nKey: "pbac_desc_create_watchlist_entries",
      scope: [Scope.Organization],
      dependsOn: ["watchlist.read"],
    },
    [CrudAction.Read]: {
      description: "View watchlist entries",
      category: "watchlist",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_watchlist_entries",
      scope: [Scope.Organization],
    },
    [CrudAction.Update]: {
      description: "Update watchlist entries",
      category: "watchlist",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_update_watchlist_entries",
      scope: [Scope.Organization],
      dependsOn: ["watchlist.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete watchlist entries",
      category: "watchlist",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_watchlist_entries",
      scope: [Scope.Organization],
      dependsOn: ["watchlist.read"],
    },
  },
};
