export type Resource =
  | "booking"
  | "eventType"
  | "team"
  | "organization"
  | "insights"
  | "availability"
  | "workflow"
  | "routingForm"
  | "*";
export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "invite"
  | "remove"
  | "billing"
  | "override"
  | "readRecordings"
  | "*";

type PermissionDetails = {
  description: string;
  category: string;
};

type ResourcePermissions = {
  [K in Action]?: PermissionDetails;
};

export type PermissionRegistry = {
  [K in Resource]?: ResourcePermissions;
};

// Keep in mind these are on a team/organization level, not a user level
export const PERMISSION_REGISTRY: PermissionRegistry = {
  eventType: {
    create: { description: "Create event types", category: "event" },
    read: { description: "View event types", category: "event" },
    update: { description: "Update event types", category: "event" },
    delete: { description: "Delete event types", category: "event" },
    manage: { description: "All actions on event types", category: "event" },
  },
  team: {
    create: { description: "Create teams", category: "team" },
    update: { description: "Update settings", category: "team" },
    invite: { description: "Invite team members", category: "team" },
    remove: { description: "Remove team members", category: "team" },
    manage: { description: "All actions on teams", category: "team" },
  },
  organization: {
    invite: { description: "Invite organization members", category: "org" },
    remove: { description: "Remove organization members", category: "org" },
    billing: { description: "Manage organization billing", category: "org" },
    update: { description: "Edit organization settings", category: "org" },
    manage: { description: "All actions on organizations", category: "org" },
  },
  booking: {
    read: { description: "View bookings", category: "booking" },
    readRecordings: { description: "View booking recordings", category: "booking" },
    update: { description: "Update bookings", category: "booking" },
    manage: { description: "All actions on bookings", category: "booking" },
  },
  insights: {
    read: { description: "View team insights and analytics", category: "insights" },
    manage: { description: "Manage team insights and analytics", category: "insights" },
  },
  availability: {
    read: { description: "View availability", category: "availability" },
    update: { description: "Update own availability", category: "availability" },
    override: { description: "Override team member availability", category: "availability" },
    manage: { description: "Manage all availability settings", category: "availability" },
  },
  workflow: {
    create: { description: "Create workflows", category: "workflow" },
    read: { description: "View workflows", category: "workflow" },
    update: { description: "Update workflows", category: "workflow" },
    delete: { description: "Delete workflows", category: "workflow" },
    manage: { description: "All actions on workflows", category: "workflow" },
  },
  routingForm: {
    create: { description: "Create routing forms", category: "routing" },
    read: { description: "View routing forms", category: "routing" },
    update: { description: "Update routing forms", category: "routing" },
    delete: { description: "Delete routing forms", category: "routing" },
    manage: { description: "All actions on routing forms", category: "routing" },
  },
};

// Helper type for permission strings in the format "resource.action"
export type PermissionString = `${Resource}.${Action}`;

// Helper function to create a permission string
export const createPermissionString = (resource: Resource, action: Action): PermissionString => {
  return `${resource}.${action}` as PermissionString;
};

// Helper function to get all permissions as an array
export const getAllPermissions = (): Array<{ resource: Resource; action: Action } & PermissionDetails> => {
  const permissions: Array<{ resource: Resource; action: Action } & PermissionDetails> = [];

  Object.entries(PERMISSION_REGISTRY).forEach(([resource, actions]) => {
    Object.entries(actions).forEach(([action, details]) => {
      permissions.push({
        resource: resource as Resource,
        action: action as Action,
        ...details,
      });
    });
  });

  return permissions;
};
