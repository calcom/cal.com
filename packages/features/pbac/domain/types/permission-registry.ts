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
  i18nKey: string;
  descriptionI18nKey: string;
}

export interface ResourceConfig {
  _resource?: {
    i18nKey: string;
  };
  [key in CrudAction | CustomAction]?: PermissionDetails;
}

export type PermissionRegistry = {
  [key in Resource]: ResourceConfig;
};

export type PermissionString = `${Resource}.${CrudAction | CustomAction}`;

/**
 * Helper function to filter out the _resource property from a ResourceConfig
 * @param config The ResourceConfig to filter
 * @returns A new object without the _resource property
 */
export const filterResourceConfig = (config: ResourceConfig): Omit<ResourceConfig, "_resource"> => {
  const { _resource, ...rest } = config;
  return rest;
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
    },
    [CrudAction.Delete]: {
      description: "Delete roles",
      category: "role",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_roles",
    },
    [CustomAction.Manage]: {
      description: "All actions on roles",
      category: "role",
      i18nKey: "pbac_action_manage",
      descriptionI18nKey: "pbac_desc_manage_roles",
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
    },
    [CrudAction.Delete]: {
      description: "Delete event types",
      category: "event",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_event_types",
    },
    [CustomAction.Manage]: {
      description: "All actions on event types",
      category: "event",
      i18nKey: "pbac_action_manage",
      descriptionI18nKey: "pbac_desc_manage_event_types",
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
    },
    [CrudAction.Delete]: {
      description: "Delete team",
      category: "team",
      i18nKey: "pbac_action_delete",
      descriptionI18nKey: "pbac_desc_delete_team",
    },
    [CustomAction.Invite]: {
      description: "Invite team members",
      category: "team",
      i18nKey: "pbac_action_invite",
      descriptionI18nKey: "pbac_desc_invite_team_members",
    },
    [CustomAction.Remove]: {
      description: "Remove team members",
      category: "team",
      i18nKey: "pbac_action_remove",
      descriptionI18nKey: "pbac_desc_remove_team_members",
    },
    [CustomAction.ChangeMemberRole]: {
      description: "Change role of team members",
      category: "team",
      i18nKey: "pbac_action_change_member_role",
      descriptionI18nKey: "pbac_desc_change_team_member_role",
    },
    [CustomAction.Manage]: {
      description: "All actions on teams",
      category: "team",
      i18nKey: "pbac_action_manage",
      descriptionI18nKey: "pbac_desc_manage_teams",
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
    },
    [CrudAction.Read]: {
      description: "View organization details",
      category: "org",
      i18nKey: "pbac_action_read",
      descriptionI18nKey: "pbac_desc_view_organization_details",
    },
    [CustomAction.ListMembers]: {
      description: "List organization members",
      category: "org",
      i18nKey: "pbac_action_list_members",
      descriptionI18nKey: "pbac_desc_list_organization_members",
    },
    [CustomAction.Invite]: {
      description: "Invite organization members",
      category: "org",
      i18nKey: "pbac_action_invite",
      descriptionI18nKey: "pbac_desc_invite_organization_members",
    },
    [CustomAction.Remove]: {
      description: "Remove organization members",
      category: "org",
      i18nKey: "pbac_action_remove",
      descriptionI18nKey: "pbac_desc_remove_organization_members",
    },
    [CustomAction.ManageBilling]: {
      description: "Manage organization billing",
      category: "org",
      i18nKey: "pbac_action_manage_billing",
      descriptionI18nKey: "pbac_desc_manage_organization_billing",
    },
    [CustomAction.ChangeMemberRole]: {
      description: "Change role of team members",
      category: "org",
      i18nKey: "pbac_action_change_member_role",
      descriptionI18nKey: "pbac_desc_change_organization_member_role",
    },
    [CrudAction.Update]: {
      description: "Edit organization settings",
      category: "org",
      i18nKey: "pbac_action_update",
      descriptionI18nKey: "pbac_desc_edit_organization_settings",
    },
    [CustomAction.Manage]: {
      description: "All actions on organizations",
      category: "org",
      i18nKey: "pbac_action_manage",
      descriptionI18nKey: "pbac_desc_manage_organizations",
    },
  },
  [Resource.Booking]: {
    _resource: {
      i18nKey: "pbac_resource_booking",
    },
    [CrudAction.Read]: {
      description: "View bookings",
      category: "booking",
      i18nKey: "pbac_resource_booking",
      descriptionI18nKey: "pbac_desc_view_bookings",
    },
    [CustomAction.ReadTeamBookings]: {
      description: "View team bookings",
      category: "booking",
      i18nKey: "pbac_resource_booking",
      descriptionI18nKey: "pbac_desc_view_team_bookings",
    },
    [CustomAction.ReadOrgBookings]: {
      description: "View organization bookings",
      category: "booking",
      i18nKey: "pbac_resource_booking",
      descriptionI18nKey: "pbac_desc_view_organization_bookings",
    },
    [CustomAction.ReadRecordings]: {
      description: "View booking recordings",
      category: "booking",
      i18nKey: "pbac_resource_booking",
      descriptionI18nKey: "pbac_desc_view_booking_recordings",
    },
    [CrudAction.Update]: {
      description: "Update bookings",
      category: "booking",
      i18nKey: "pbac_resource_booking",
      descriptionI18nKey: "pbac_desc_update_bookings",
    },
    [CustomAction.Manage]: {
      description: "All actions on bookings",
      category: "booking",
      i18nKey: "pbac_resource_booking",
      descriptionI18nKey: "pbac_desc_manage_bookings",
    },
  },
  [Resource.Insights]: {
    _resource: {
      i18nKey: "pbac_resource_insights",
    },
    [CrudAction.Read]: {
      description: "View team insights and analytics",
      category: "insights",
      i18nKey: "pbac_resource_insights",
      descriptionI18nKey: "pbac_desc_view_team_insights",
    },
    [CustomAction.Manage]: {
      description: "Manage team insights and analytics",
      category: "insights",
      i18nKey: "pbac_resource_insights",
      descriptionI18nKey: "pbac_desc_manage_team_insights",
    },
  },
};
