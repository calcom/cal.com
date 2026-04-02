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
  FeatureOptIn = "featureOptIn",
  CustomDomain = "organization.customDomain",
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
  PasswordReset = "passwordReset",
  ReadTeamAuditLogs = "readTeamAuditLogs",
  ReadOrgAuditLogs = "readOrgAuditLogs",
}

export enum Scope {
  Team = "team",
  Organization = "organization",
  System = "system",
}

export interface PermissionDetails {
  description: string;
  category: string;
  scope?: Scope[]; // Optional for backward compatibility
  dependsOn?: PermissionString[]; // Dependencies that must be enabled when this permission is enabled
  visibleWhen?: {
    teamPrivacy?: "private" | "public" | "both"; // Control visibility based on team privacy setting
  };
}

export type ResourceConfig = {
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
 * Filter resources and actions based on scope and optionally team privacy settings
 * @param scope The scope to filter by (Team or Organization)
 * @param isPrivate Whether the team/organization is private (optional)
 * @returns Filtered permission registry
 */
export const getPermissionsForScope = (scope: Scope, isPrivate?: boolean): PermissionRegistry => {
  const filteredRegistry: Partial<PermissionRegistry> = {};
  const teamPrivacy = isPrivate !== undefined ? (isPrivate ? "private" : "public") : undefined;

  Object.entries(PERMISSION_REGISTRY).forEach(([resource, config]) => {
    const filteredConfig: ResourceConfig = {};

    Object.entries(config).forEach(([action, details]) => {

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
    const hasActions = Object.keys(filteredConfig).length > 0;
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

/**
 * Central registry of all resources and their permitted actions.
 * Keep in mind these are on a team/organization level, not a user level.
 *
 * i18n labels for resources and actions live separately in the app router:
 *   apps/web/.../organizations/roles/_components/permission-labels.ts
 * Adding a resource or action here will cause a TypeScript error there
 * until the corresponding label is added.
 */
export const PERMISSION_REGISTRY = {
  [Resource.All]: {

    [CrudAction.All]: {
      description: "All actions on all resources",
      category: "system",
      scope: [Scope.Organization], // Only organizations should have "All" permissions
    },
  },
  [Resource.Role]: {

    [CrudAction.Create]: {
      description: "Create roles",
      category: "role",
      dependsOn: ["role.read"],
    },
    [CrudAction.Read]: {
      description: "View roles",
      category: "role",
    },
    [CrudAction.Update]: {
      description: "Update roles",
      category: "role",
      dependsOn: ["role.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete roles",
      category: "role",
      dependsOn: ["role.read"],
    },
  },
  [Resource.EventType]: {

    [CrudAction.Create]: {
      description: "Create event types",
      category: "event",
      dependsOn: ["eventType.read"],
    },
    [CrudAction.Read]: {
      description: "View event types",
      category: "event",
    },
    [CrudAction.Update]: {
      description: "Update event types",
      category: "event",
      dependsOn: ["eventType.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete event types",
      category: "event",
      dependsOn: ["eventType.read"],
    },
  },
  [Resource.Team]: {

    [CrudAction.Create]: {
      description: "Create teams",
      category: "team",
      scope: [Scope.Organization],
      dependsOn: ["team.read"],
    },
    [CrudAction.Read]: {
      description: "View team details",
      category: "team",
    },
    [CrudAction.Update]: {
      description: "Update settings",
      category: "team",
      dependsOn: ["team.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete team",
      category: "team",
      dependsOn: ["team.read"],
    },
    [CustomAction.Invite]: {
      description: "Invite team members",
      category: "team",
      dependsOn: ["team.read", "team.listMembers", "role.read"],
    },
    [CustomAction.Remove]: {
      description: "Remove team members",
      category: "team",
      dependsOn: ["team.read", "team.listMembers"],
    },
    [CustomAction.ListMembers]: {
      description: "List team members",
      category: "team",
      dependsOn: ["team.read"],
      visibleWhen: {
        teamPrivacy: "public",
      },
    },
    [CustomAction.ListMembersPrivate]: {
      description: "List private team members",
      category: "team",
      dependsOn: ["team.read"],
      visibleWhen: {
        teamPrivacy: "private",
      },
    },
    [CustomAction.ChangeMemberRole]: {
      description: "Change role of team members",
      category: "team",
      dependsOn: ["team.read", "team.listMembers", "role.read"],
    },
    [CustomAction.Impersonate]: {
      description: "Impersonate team members",
      category: "team",
      dependsOn: ["team.read", "team.listMembers"],
    },
    [CustomAction.ManageBilling]: {
      description: "Manage billing",
      category: "team",
      scope: [],
    },
  },
  [Resource.Organization]: {

    [CrudAction.Create]: {
      description: "Create organization",
      category: "org",
      scope: [Scope.Organization],
    },
    [CrudAction.Read]: {
      description: "View organization details",
      category: "org",
      scope: [Scope.Organization],
    },
    [CustomAction.ListMembers]: {
      description: "List organization members",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
      visibleWhen: {
        teamPrivacy: "public",
      },
    },
    [CustomAction.ListMembersPrivate]: {
      description: "List private organization members",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
      visibleWhen: {
        teamPrivacy: "private",
      },
    },
    [CustomAction.Invite]: {
      description: "Invite organization members",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers"],
    },
    [CustomAction.Remove]: {
      description: "Remove organization members",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers"],
    },
    [CustomAction.ManageBilling]: {
      description: "Manage organization billing",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
    },
    [CustomAction.ChangeMemberRole]: {
      description: "Change role of team members",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers", "role.read"],
    },
    [CustomAction.Impersonate]: {
      description: "Impersonate organization members",
      category: "org",
      scope: [Scope.Organization],
    },
    [CustomAction.PasswordReset]: {
      description: "Reset passwords for organization members",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.listMembers"],
    },
    [CustomAction.EditUsers]: {
      description: "Edit organization user profiles",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.read", "organization.listMembers"],
    },
    [CrudAction.Update]: {
      description: "Edit organization settings",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete organization",
      category: "org",
      scope: [Scope.Organization],
      dependsOn: ["organization.read"],
    },
  },
  [Resource.Booking]: {

    [CrudAction.Read]: {
      description: "View bookings",
      category: "booking",
    },
    [CustomAction.ReadTeamBookings]: {
      description: "View team bookings",
      category: "booking",
      scope: [Scope.Team],
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadOrgBookings]: {
      description: "View organization bookings",
      category: "booking",
      scope: [Scope.Organization],
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadRecordings]: {
      description: "View booking recordings",
      category: "booking",
      dependsOn: ["booking.read"],
    },
    [CrudAction.Update]: {
      description: "Update bookings",
      category: "booking",
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadTeamAuditLogs]: {
      description: "View team booking audit logs",
      category: "booking",
      scope: [Scope.Team],
      dependsOn: ["booking.read"],
    },
    [CustomAction.ReadOrgAuditLogs]: {
      description: "View organization booking audit logs",
      category: "booking",
      scope: [Scope.Organization],
      dependsOn: ["booking.read"],
    },
  },
  [Resource.Insights]: {

    [CrudAction.Read]: {
      description: "View team insights and analytics",
      category: "insights",
    },
  },
  [Resource.Workflow]: {

    [CrudAction.Create]: {
      description: "Create workflows",
      category: "workflow",
      dependsOn: ["workflow.read"],
    },
    [CrudAction.Read]: {
      description: "View workflows",
      category: "workflow",
    },
    [CrudAction.Update]: {
      description: "Update workflows",
      category: "workflow",
      dependsOn: ["workflow.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete workflows",
      category: "workflow",
      dependsOn: ["workflow.read"],
    },
  },
  [Resource.Attributes]: {

    [CrudAction.Read]: {
      description: "View organization attributes",
      category: "attributes",
      scope: [Scope.Organization],
    },
    [CrudAction.Update]: {
      description: "Update organization attributes",
      category: "attributes",
      scope: [Scope.Organization],
      dependsOn: ["organization.attributes.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete organization attributes",
      category: "attributes",
      scope: [Scope.Organization],
      dependsOn: ["organization.attributes.read"],
    },
    [CrudAction.Create]: {
      description: "Create organization attributes",
      category: "attributes",
      scope: [Scope.Organization],
      dependsOn: ["organization.attributes.read"],
    },
    [CustomAction.EditUsers]: {
      description: "Edit user attributes",
      category: "attributes",
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

    [CrudAction.Create]: {
      description: "Create routing forms",
      category: "routing",
      dependsOn: ["routingForm.read"],
    },
    [CrudAction.Read]: {
      description: "View routing forms",
      category: "routing",
    },
    [CrudAction.Update]: {
      description: "Update routing forms",
      category: "routing",
      dependsOn: ["routingForm.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete routing forms",
      category: "routing",
      dependsOn: ["routingForm.read"],
    },
  },
  [Resource.Webhook]: {

    [CrudAction.Create]: {
      description: "Create webhooks",
      category: "webhook",
      dependsOn: ["webhook.read"],
    },
    [CrudAction.Read]: {
      description: "View webhooks",
      category: "webhook",
    },
    [CrudAction.Update]: {
      description: "Update webhooks",
      category: "webhook",
      dependsOn: ["webhook.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete webhooks",
      category: "webhook",
      dependsOn: ["webhook.read"],
    },
  },
  [Resource.Availability]: {

    [CrudAction.Create]: {
      description: "Create availability",
      category: "availability",
      scope: [],
      dependsOn: ["availability.read"],
    },
    [CrudAction.Read]: {
      description: "View availability",
      category: "availability",
      scope: [],
    },
    [CrudAction.Update]: {
      description: "Update availability",
      category: "availability",
      scope: [],
      dependsOn: ["availability.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete availability",
      category: "availability",
      scope: [],
      dependsOn: ["availability.read"],
    },
  },
  [Resource.OutOfOffice]: {

    [CrudAction.Create]: {
      description: "Create out of office",
      category: "ooo",
      scope: [],
      dependsOn: ["ooo.read"],
    },
    [CrudAction.Read]: {
      description: "View out of office",
      category: "ooo",
      scope: [],
    },
    [CrudAction.Update]: {
      description: "Update out of office",
      category: "ooo",
      scope: [],
      dependsOn: ["ooo.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete out of office",
      category: "ooo",
      scope: [],
      dependsOn: ["ooo.read"],
    },
  },
  [Resource.Watchlist]: {

    [CrudAction.Create]: {
      description: "Create watchlist entries",
      category: "watchlist",
      scope: [Scope.Organization],
      dependsOn: ["watchlist.read"],
    },
    [CrudAction.Read]: {
      description: "View watchlist entries",
      category: "watchlist",
      scope: [Scope.Organization],
    },
    [CrudAction.Update]: {
      description: "Update watchlist entries",
      category: "watchlist",
      scope: [Scope.Organization],
      dependsOn: ["watchlist.read"],
    },
    [CrudAction.Delete]: {
      description: "Delete watchlist entries",
      category: "watchlist",
      scope: [Scope.Organization],
      dependsOn: ["watchlist.read"],
    },
  },
  [Resource.FeatureOptIn]: {

    [CrudAction.Read]: {
      description: "View feature opt-in settings",
      category: "featureOptIn",
    },
    [CrudAction.Update]: {
      description: "Manage feature opt-in settings",
      category: "featureOptIn",
      dependsOn: ["featureOptIn.read"],
    },
  },
  [Resource.CustomDomain]: {
    [CrudAction.Create]: {
      description: "Add custom domains",
      category: "customDomain",
      scope: [Scope.Organization],
      dependsOn: ["organization.customDomain.read"],
    },
    [CrudAction.Read]: {
      description: "View custom domains",
      category: "customDomain",
      scope: [Scope.Organization],
    },
    [CrudAction.Update]: {
      description: "Update custom domains",
      category: "customDomain",
      scope: [Scope.Organization],
      dependsOn: ["organization.customDomain.read"],
    },
    [CrudAction.Delete]: {
      description: "Remove custom domains",
      category: "customDomain",
      scope: [Scope.Organization],
      dependsOn: ["organization.customDomain.read"],
    },
  },
} satisfies PermissionRegistry;
