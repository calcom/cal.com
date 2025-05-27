import { Resource, CrudAction, CustomAction } from "../domain/types/permission-registry";

/**
 * Default role IDs used in the PBAC system
 * These IDs match the ones created in the migration
 */
export const DEFAULT_ROLES = {
  OWNER: "owner_role",
  ADMIN: "admin_role",
  MEMBER: "member_role",
} as const;

/**
 * Type for default role IDs
 */
export type DefaultRoleId = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];

/**
 * Mapping of default roles to their descriptions
 */
export const DEFAULT_ROLE_DESCRIPTIONS = {
  [DEFAULT_ROLES.OWNER]: "pbac_owner_role_description",
  [DEFAULT_ROLES.ADMIN]: "pbac_admin_role_description",
  [DEFAULT_ROLES.MEMBER]: "pbac_member_role_description",
} as const;

/**
 * i18n keys for resources
 */
export const RESOURCE_I18N_KEYS = {
  [Resource.All]: "pbac_resource_all",
  [Resource.EventType]: "pbac_resource_event_type",
  [Resource.Team]: "pbac_resource_team",
  [Resource.Organization]: "pbac_resource_organization",
  [Resource.Booking]: "pbac_resource_booking",
  [Resource.Insights]: "pbac_resource_insights",
  [Resource.Role]: "pbac_resource_role",
} as const;

/**
 * i18n keys for CRUD actions
 */
export const CRUD_ACTION_I18N_KEYS = {
  [CrudAction.All]: "pbac_action_all",
  [CrudAction.Create]: "pbac_action_create",
  [CrudAction.Read]: "pbac_action_read",
  [CrudAction.Update]: "pbac_action_update",
  [CrudAction.Delete]: "pbac_action_delete",
} as const;

/**
 * i18n keys for custom actions
 */
export const CUSTOM_ACTION_I18N_KEYS = {
  [CustomAction.Manage]: "pbac_action_manage",
  [CustomAction.Invite]: "pbac_action_invite",
  [CustomAction.Remove]: "pbac_action_remove",
  [CustomAction.ChangeMemberRole]: "pbac_action_change_member_role",
  [CustomAction.ListMembers]: "pbac_action_list_members",
  [CustomAction.ManageBilling]: "pbac_action_manage_billing",
  [CustomAction.ReadTeamBookings]: "pbac_action_read_team_bookings",
  [CustomAction.ReadOrgBookings]: "pbac_action_read_org_bookings",
  [CustomAction.ReadRecordings]: "pbac_action_read_recordings",
} as const;

/**
 * i18n keys for permission descriptions
 */
export const PERMISSION_DESCRIPTION_I18N_KEYS = {
  // System
  "*.*": "pbac_desc_all_actions_all_resources",

  // Roles
  "role.create": "pbac_desc_create_roles",
  "role.read": "pbac_desc_view_roles",
  "role.update": "pbac_desc_update_roles",
  "role.delete": "pbac_desc_delete_roles",
  "role.manage": "pbac_desc_manage_roles",

  // Event Types
  "eventType.create": "pbac_desc_create_event_types",
  "eventType.read": "pbac_desc_view_event_types",
  "eventType.update": "pbac_desc_update_event_types",
  "eventType.delete": "pbac_desc_delete_event_types",
  "eventType.manage": "pbac_desc_manage_event_types",

  // Teams
  "team.create": "pbac_desc_create_teams",
  "team.read": "pbac_desc_view_team_details",
  "team.update": "pbac_desc_update_team_settings",
  "team.delete": "pbac_desc_delete_team",
  "team.invite": "pbac_desc_invite_team_members",
  "team.remove": "pbac_desc_remove_team_members",
  "team.changeMemberRole": "pbac_desc_change_team_member_role",
  "team.manage": "pbac_desc_manage_teams",

  // Organizations
  "organization.create": "pbac_desc_create_organization",
  "organization.read": "pbac_desc_view_organization_details",
  "organization.listMembers": "pbac_desc_list_organization_members",
  "organization.invite": "pbac_desc_invite_organization_members",
  "organization.remove": "pbac_desc_remove_organization_members",
  "organization.manageBilling": "pbac_desc_manage_organization_billing",
  "organization.update": "pbac_desc_edit_organization_settings",
  "organization.manage": "pbac_desc_manage_organizations",

  // Bookings
  "booking.read": "pbac_desc_view_bookings",
  "booking.readTeamBookings": "pbac_desc_view_team_bookings",
  "booking.readOrgBookings": "pbac_desc_view_organization_bookings",
  "booking.readRecordings": "pbac_desc_view_booking_recordings",
  "booking.update": "pbac_desc_update_bookings",
  "booking.manage": "pbac_desc_manage_bookings",

  // Insights
  "insights.read": "pbac_desc_view_team_insights",
  "insights.manage": "pbac_desc_manage_team_insights",
} as const;

/**
 * Consolidated configuration for each resource including its i18n keys and available actions
 */
export const RESOURCE_CONFIG = {
  [Resource.All]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.All],
    actions: {
      [CrudAction.All]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.All],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["*.*"],
      },
    },
  },
  [Resource.Role]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.Role],
    actions: {
      [CrudAction.Create]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Create],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["role.create"],
      },
      [CrudAction.Read]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Read],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["role.read"],
      },
      [CrudAction.Update]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Update],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["role.update"],
      },
      [CrudAction.Delete]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Delete],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["role.delete"],
      },
      [CustomAction.Manage]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Manage],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["role.manage"],
      },
    },
  },
  [Resource.EventType]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.EventType],
    actions: {
      [CrudAction.Create]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Create],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["eventType.create"],
      },
      [CrudAction.Read]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Read],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["eventType.read"],
      },
      [CrudAction.Update]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Update],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["eventType.update"],
      },
      [CrudAction.Delete]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Delete],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["eventType.delete"],
      },
      [CustomAction.Manage]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Manage],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["eventType.manage"],
      },
    },
  },
  [Resource.Team]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.Team],
    actions: {
      [CrudAction.Create]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Create],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.create"],
      },
      [CrudAction.Read]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Read],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.read"],
      },
      [CrudAction.Update]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Update],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.update"],
      },
      [CrudAction.Delete]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Delete],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.delete"],
      },
      [CustomAction.Invite]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Invite],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.invite"],
      },
      [CustomAction.Remove]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Remove],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.remove"],
      },
      [CustomAction.ChangeMemberRole]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.ChangeMemberRole],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.changeMemberRole"],
      },
      [CustomAction.Manage]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Manage],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["team.manage"],
      },
    },
  },
  [Resource.Organization]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.Organization],
    actions: {
      [CrudAction.Create]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Create],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.create"],
      },
      [CrudAction.Read]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Read],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.read"],
      },
      [CrudAction.Update]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Update],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.update"],
      },
      [CustomAction.ListMembers]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.ListMembers],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.listMembers"],
      },
      [CustomAction.Invite]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Invite],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.invite"],
      },
      [CustomAction.Remove]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Remove],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.remove"],
      },
      [CustomAction.ManageBilling]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.ManageBilling],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.manageBilling"],
      },
      [CustomAction.Manage]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Manage],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["organization.manage"],
      },
    },
  },
  [Resource.Booking]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.Booking],
    actions: {
      [CrudAction.Read]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Read],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["booking.read"],
      },
      [CrudAction.Update]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Update],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["booking.update"],
      },
      [CustomAction.ReadTeamBookings]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.ReadTeamBookings],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["booking.readTeamBookings"],
      },
      [CustomAction.ReadOrgBookings]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.ReadOrgBookings],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["booking.readOrgBookings"],
      },
      [CustomAction.ReadRecordings]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.ReadRecordings],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["booking.readRecordings"],
      },
      [CustomAction.Manage]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Manage],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["booking.manage"],
      },
    },
  },
  [Resource.Insights]: {
    i18nKey: RESOURCE_I18N_KEYS[Resource.Insights],
    actions: {
      [CrudAction.Read]: {
        i18nKey: CRUD_ACTION_I18N_KEYS[CrudAction.Read],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["insights.read"],
      },
      [CustomAction.Manage]: {
        i18nKey: CUSTOM_ACTION_I18N_KEYS[CustomAction.Manage],
        descriptionKey: PERMISSION_DESCRIPTION_I18N_KEYS["insights.manage"],
      },
    },
  },
} as const;

// Type for the resource configuration
export type ResourceConfig = typeof RESOURCE_CONFIG;
