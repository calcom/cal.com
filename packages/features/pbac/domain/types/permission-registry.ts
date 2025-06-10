export enum Resource {
  All = "*",
  EventType = "eventType",
  Team = "team",
  Organization = "organization",
  Booking = "booking",
  Insights = "insights",
  Role = "role",
}

export enum CrudAction {
  All = "*",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
}

export enum CustomAction {
  Manage = "manage",
  Invite = "invite",
  Remove = "remove",
  ChangeMemberRole = "changeMemberRole",
  ListMembers = "listMembers",
  ManageBilling = "manageBilling",
  ReadTeamBookings = "readTeamBookings",
  ReadOrgBookings = "readOrgBookings",
  ReadRecordings = "readRecordings",
}

export interface PermissionDetails {
  description: string;
  category: string;
}

export type PermissionRegistry = {
  [key in Resource]: {
    [key in CrudAction | CustomAction]?: PermissionDetails;
  };
};

export type PermissionString = `${Resource}.${CrudAction | CustomAction}`;

// Keep in mind these are on a team/organization level, not a user level
export const PERMISSION_REGISTRY: PermissionRegistry = {
  [Resource.All]: {
    [CrudAction.All]: { description: "All actions on all resources", category: "system" },
  },
  [Resource.Role]: {
    [CrudAction.Create]: { description: "Create roles", category: "role" },
    [CrudAction.Read]: { description: "View roles", category: "role" },
    [CrudAction.Update]: { description: "Update roles", category: "role" },
    [CrudAction.Delete]: { description: "Delete roles", category: "role" },
    [CustomAction.Manage]: { description: "All actions on roles", category: "role" },
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
    [CustomAction.ChangeMemberRole]: { description: "Change role of team members", category: "org" },
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
};
