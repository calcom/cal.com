export enum CrudAction {
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
  All = "*", // Wildcard for all CRUD actions
}

export enum Resource {
  EventType = "eventType",
  Booking = "booking",
  Team = "team",
  Organization = "organization",
  Insights = "insights",
  Availability = "availability",
  Workflow = "workflow",
  RoutingForm = "routingForm",
  ApiKey = "apiKey",
  All = "*", // Wildcard for all resources
}

export enum CustomAction {
  Manage = "manage", // Full control over a resource
  Invite = "invite", // Invite members to team/org
  Remove = "remove", // Remove members from team/org
  Override = "override", // Override availability
  ReadRecordings = "readRecordings", // Access booking recordings
  ManageBilling = "manageBilling", // Manage org billing
  ChangeMemberRole = "changeMemberRole", // Change role of team members
  ListMembers = "listMembers", // List organization members
  ReadTeamBookings = "readTeamBookings", // Read team bookings
  ReadOrgBookings = "readOrgBookings", // Read organization bookings
  FindKeyOfType = "findKeyOfType", // Find API keys by type
  All = "*", // Wildcard for all custom actions
}

export type CrudScope = `${Resource}.${CrudAction}` | `${Resource}.*` | `*.*`;
export type CustomScope = `${Resource}.${CustomAction}` | `${Resource}.*` | `*.*`;
export type PermissionString = CrudScope | CustomScope;

export type PermissionDetails = {
  description: string;
  category: string;
};

export type ResourcePermissions = {
  [K in CrudAction | CustomAction]?: PermissionDetails;
};

export type PermissionRegistry = {
  [K in Resource]: ResourcePermissions;
};

// Keep in mind these are on a team/organization level, not a user level
export const PERMISSION_REGISTRY: PermissionRegistry = {
  [Resource.All]: {
    [CrudAction.All]: { description: "All actions on all resources", category: "system" },
  },
  [Resource.EventType]: {
    [CrudAction.Create]: { description: "Create event types", category: "event" },
    [CrudAction.Read]: { description: "View event types", category: "event" },
    [CrudAction.Update]: { description: "Update event types", category: "event" },
    [CrudAction.Delete]: { description: "Delete event types", category: "event" },
    [CustomAction.Manage]: { description: "All actions on event types", category: "event" },
  },
  [Resource.Team]: {
    [CrudAction.Create]: { description: "Create teams", category: "team" },
    [CrudAction.Read]: { description: "View team details", category: "team" },
    [CrudAction.Update]: { description: "Update settings", category: "team" },
    [CrudAction.Delete]: { description: "Delete team", category: "team" },
    [CustomAction.Invite]: { description: "Invite team members", category: "team" },
    [CustomAction.Remove]: { description: "Remove team members", category: "team" },
    [CustomAction.ChangeMemberRole]: { description: "Change role of team members", category: "team" },
    [CustomAction.Manage]: { description: "All actions on teams", category: "team" },
  },
  [Resource.Organization]: {
    [CrudAction.Create]: { description: "Create organization", category: "org" },
    [CrudAction.Read]: { description: "View organization details", category: "org" },
    [CustomAction.ListMembers]: { description: "List organization members", category: "org" },
    [CustomAction.Invite]: { description: "Invite organization members", category: "org" },
    [CustomAction.Remove]: { description: "Remove organization members", category: "org" },
    [CustomAction.ManageBilling]: { description: "Manage organization billing", category: "org" },
    [CrudAction.Update]: { description: "Edit organization settings", category: "org" },
    [CustomAction.Manage]: { description: "All actions on organizations", category: "org" },
  },
  [Resource.Booking]: {
    [CrudAction.Read]: { description: "View bookings", category: "booking" },
    [CustomAction.ReadTeamBookings]: { description: "View team bookings", category: "booking" },
    [CustomAction.ReadOrgBookings]: { description: "View organization bookings", category: "booking" },
    [CustomAction.ReadRecordings]: { description: "View booking recordings", category: "booking" },
    [CrudAction.Update]: { description: "Update bookings", category: "booking" },
    [CustomAction.Manage]: { description: "All actions on bookings", category: "booking" },
  },
  [Resource.Insights]: {
    [CrudAction.Read]: { description: "View team insights and analytics", category: "insights" },
    [CustomAction.Manage]: { description: "Manage team insights and analytics", category: "insights" },
  },
  [Resource.Availability]: {
    [CrudAction.Read]: { description: "View availability", category: "availability" },
    [CrudAction.Update]: { description: "Update own availability", category: "availability" },
    [CustomAction.Override]: { description: "Override team member availability", category: "availability" },
    [CustomAction.Manage]: { description: "Manage all availability settings", category: "availability" },
  },
  [Resource.Workflow]: {
    [CrudAction.Create]: { description: "Create workflows", category: "workflow" },
    [CrudAction.Read]: { description: "View workflows", category: "workflow" },
    [CrudAction.Update]: { description: "Update workflows", category: "workflow" },
    [CrudAction.Delete]: { description: "Delete workflows", category: "workflow" },
    [CustomAction.Manage]: { description: "All actions on workflows", category: "workflow" },
  },
  [Resource.RoutingForm]: {
    [CrudAction.Create]: { description: "Create routing forms", category: "routing" },
    [CrudAction.Read]: { description: "View routing forms", category: "routing" },
    [CrudAction.Update]: { description: "Update routing forms", category: "routing" },
    [CrudAction.Delete]: { description: "Delete routing forms", category: "routing" },
    [CustomAction.Manage]: { description: "All actions on routing forms", category: "routing" },
  },
  [Resource.ApiKey]: {
    [CrudAction.Create]: { description: "Create API keys", category: "apiKey" },
    [CrudAction.Read]: { description: "View API keys", category: "apiKey" },
    [CustomAction.FindKeyOfType]: { description: "Find API keys by type", category: "apiKey" },
    [CrudAction.Delete]: { description: "Delete API keys", category: "apiKey" },
    [CustomAction.Manage]: { description: "All actions on API keys", category: "apiKey" },
  },
};
