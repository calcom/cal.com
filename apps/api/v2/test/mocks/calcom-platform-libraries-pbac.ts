// Inline enums matching the real implementation
export enum Scope {
  Team = "team",
  Organization = "organization",
}

enum Resource {
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
}

enum CrudAction {
  All = "*",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
}

enum CustomAction {
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

// Compact permission registry: resource -> action -> allowed scopes (undefined = both, empty = neither)
const REGISTRY: Record<string, Record<string, Scope[] | undefined>> = {
  [Resource.All]: { [CrudAction.All]: [Scope.Organization] },
  [Resource.Role]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
  },
  [Resource.EventType]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
  },
  [Resource.Team]: {
    [CrudAction.Create]: [Scope.Organization],
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
    [CustomAction.Invite]: undefined,
    [CustomAction.Remove]: undefined,
    [CustomAction.ListMembers]: undefined,
    [CustomAction.ListMembersPrivate]: undefined,
    [CustomAction.ChangeMemberRole]: undefined,
    [CustomAction.Impersonate]: undefined,
    [CustomAction.ManageBilling]: [],
  },
  [Resource.Organization]: {
    [CrudAction.Create]: [Scope.Organization],
    [CrudAction.Read]: [Scope.Organization],
    [CrudAction.Update]: [Scope.Organization],
    [CustomAction.ListMembers]: [Scope.Organization],
    [CustomAction.ListMembersPrivate]: [Scope.Organization],
    [CustomAction.Invite]: [Scope.Organization],
    [CustomAction.Remove]: [Scope.Organization],
    [CustomAction.ManageBilling]: [Scope.Organization],
    [CustomAction.ChangeMemberRole]: [Scope.Organization],
    [CustomAction.Impersonate]: [Scope.Organization],
    [CustomAction.PasswordReset]: [Scope.Organization],
  },
  [Resource.Booking]: {
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CustomAction.ReadTeamBookings]: [Scope.Team],
    [CustomAction.ReadOrgBookings]: [Scope.Organization],
    [CustomAction.ReadRecordings]: undefined,
    [CustomAction.ReadTeamAuditLogs]: [Scope.Team],
    [CustomAction.ReadOrgAuditLogs]: [Scope.Organization],
  },
  [Resource.Insights]: { [CrudAction.Read]: undefined },
  [Resource.Workflow]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
  },
  [Resource.Attributes]: {
    [CrudAction.Read]: [Scope.Organization],
    [CrudAction.Update]: [Scope.Organization],
    [CrudAction.Delete]: [Scope.Organization],
    [CrudAction.Create]: [Scope.Organization],
    [CustomAction.EditUsers]: [Scope.Organization],
  },
  [Resource.RoutingForm]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
  },
  [Resource.Webhook]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
  },
  [Resource.Availability]: {
    [CrudAction.Create]: [],
    [CrudAction.Read]: [],
    [CrudAction.Update]: [],
    [CrudAction.Delete]: [],
  },
  [Resource.OutOfOffice]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Update]: undefined,
    [CrudAction.Delete]: undefined,
  },
  [Resource.Watchlist]: {
    [CrudAction.Create]: [Scope.Organization],
    [CrudAction.Read]: [Scope.Organization],
    [CrudAction.Update]: [Scope.Organization],
    [CrudAction.Delete]: [Scope.Organization],
  },
  [Resource.FeatureOptIn]: {
    [CrudAction.Create]: undefined,
    [CrudAction.Read]: undefined,
    [CrudAction.Delete]: undefined,
  },
};

const parsePermissionString = (permission: string): { resource: string; action: string } => {
  const lastDotIndex = permission.lastIndexOf(".");
  return {
    resource: permission.substring(0, lastDotIndex),
    action: permission.substring(lastDotIndex + 1),
  };
};

export const isValidPermissionString = (val: unknown): boolean => {
  if (typeof val !== "string") return false;

  if (val.endsWith("._resource")) {
    const resourcePart = val.slice(0, -10);
    return Object.values(Resource).includes(resourcePart as Resource);
  }

  const lastDotIndex = val.lastIndexOf(".");
  if (lastDotIndex === -1) return false;

  const { resource, action } = parsePermissionString(val);

  const isValidResource = Object.values(Resource).includes(resource as Resource);
  const isValidAction =
    Object.values(CrudAction).includes(action as CrudAction) ||
    Object.values(CustomAction).includes(action as CustomAction);

  return isValidResource && isValidAction;
};

const getPermissionStringsForScope = (scope: Scope): Set<string> => {
  const result = new Set<string>();
  for (const [resource, actions] of Object.entries(REGISTRY)) {
    for (const [action, allowedScopes] of Object.entries(actions)) {
      // undefined means both scopes allowed, empty array means neither
      if (!allowedScopes || allowedScopes.includes(scope)) {
        result.add(`${resource}.${action}`);
      }
    }
  }
  return result;
};

export const getAllPermissionStringsForScope = (scope: Scope): string[] => {
  return Array.from(getPermissionStringsForScope(scope));
};

export const isValidPermissionStringForScope = (val: unknown, scope: Scope): boolean => {
  if (!isValidPermissionString(val)) return false;
  return getPermissionStringsForScope(scope).has(val as string);
};

export class RoleService {
  createRole = jest.fn();
  getRole = jest.fn();
  getTeamRoles = jest.fn();
  roleBelongsToTeam = jest.fn();
  update = jest.fn();
  deleteRole = jest.fn();
}

export class PermissionCheckService {
  checkPermissions = jest.fn();
}

export class FeaturesRepository {
  getFeatures = jest.fn();
}
