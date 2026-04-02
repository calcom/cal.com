import {
  type CrudAction,
  type CustomAction,
  PERMISSION_REGISTRY,
  Resource,
} from "@calcom/features/pbac/domain/types/permission-registry";

export interface PermissionLabel {
  i18nKey: string;
  descriptionI18nKey: string;
}

/**
 * Type derived from PERMISSION_REGISTRY — requires a label for every
 * resource key in the registry. If someone adds a new resource to the
 * registry, TypeScript will error here until the corresponding label is added.
 */
type ResourceLabelsMap = {
  [R in keyof typeof PERMISSION_REGISTRY]: string;
};

export const RESOURCE_LABELS: ResourceLabelsMap = {
  [Resource.All]: "pbac_resource_all",
  [Resource.Role]: "pbac_resource_role",
  [Resource.EventType]: "pbac_resource_event_type",
  [Resource.Team]: "pbac_resource_team",
  [Resource.Organization]: "pbac_resource_organization",
  [Resource.Booking]: "pbac_resource_booking",
  [Resource.Insights]: "pbac_resource_insights",
  [Resource.Workflow]: "pbac_resource_workflow",
  [Resource.Attributes]: "pbac_resource_attributes",
  [Resource.RoutingForm]: "pbac_resource_routing_form",
  [Resource.Webhook]: "pbac_resource_webhook",
  [Resource.Availability]: "pbac_resource_availability",
  [Resource.OutOfOffice]: "pbac_resource_out_of_office",
  [Resource.Watchlist]: "pbac_resource_blocklist",
  [Resource.FeatureOptIn]: "pbac_resource_feature_opt_in",
  [Resource.CustomDomain]: "pbac_resource_custom_domain",
};

/**
 * Type derived from PERMISSION_REGISTRY — requires a PermissionLabel for every
 * action key in every resource. If someone adds a new action to the registry,
 * TypeScript will error here until the corresponding label is added.
 */
type PermissionLabelsMap = {
  [R in keyof typeof PERMISSION_REGISTRY]: {
    [A in keyof (typeof PERMISSION_REGISTRY)[R]]: PermissionLabel;
  };
};

export const PERMISSION_LABELS: PermissionLabelsMap = {
  [Resource.All]: {
    "*": { i18nKey: "pbac_resource_all", descriptionI18nKey: "pbac_desc_all_actions_all_resources" },
  },
  [Resource.Role]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_roles" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_roles" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_roles" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_roles" },
  },
  [Resource.EventType]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_event_types" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_event_types" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_event_types" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_event_types" },
  },
  [Resource.Team]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_teams" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_team_details" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_team_settings" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_team" },
    invite: { i18nKey: "pbac_action_invite", descriptionI18nKey: "pbac_desc_invite_team_members" },
    remove: { i18nKey: "pbac_action_remove", descriptionI18nKey: "pbac_desc_remove_team_members" },
    listMembers: { i18nKey: "pbac_action_list_members", descriptionI18nKey: "pbac_desc_list_team_members" },
    listMembersPrivate: {
      i18nKey: "pbac_action_list_members",
      descriptionI18nKey: "pbac_desc_list_team_members",
    },
    changeMemberRole: {
      i18nKey: "pbac_action_change_member_role",
      descriptionI18nKey: "pbac_desc_change_team_member_role",
    },
    impersonate: { i18nKey: "pbac_action_impersonate", descriptionI18nKey: "pbac_desc_impersonate_team_members" },
    manageBilling: { i18nKey: "pbac_action_manage_billing", descriptionI18nKey: "pbac_desc_manage_billing" },
  },
  [Resource.Organization]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_organization" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_organization_details" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_edit_organization_settings" },
    listMembers: {
      i18nKey: "pbac_action_list_members",
      descriptionI18nKey: "pbac_desc_list_organization_members",
    },
    listMembersPrivate: {
      i18nKey: "pbac_action_list_members",
      descriptionI18nKey: "pbac_desc_list_organization_members",
    },
    invite: { i18nKey: "pbac_action_invite", descriptionI18nKey: "pbac_desc_invite_organization_members" },
    remove: { i18nKey: "pbac_action_remove", descriptionI18nKey: "pbac_desc_remove_organization_members" },
    manageBilling: {
      i18nKey: "pbac_action_manage_billing",
      descriptionI18nKey: "pbac_desc_manage_organization_billing",
    },
    changeMemberRole: {
      i18nKey: "pbac_action_change_member_role",
      descriptionI18nKey: "pbac_desc_change_organization_member_role",
    },
    impersonate: {
      i18nKey: "pbac_action_impersonate",
      descriptionI18nKey: "pbac_desc_impersonate_organization_members",
    },
    passwordReset: {
      i18nKey: "pbac_action_password_reset",
      descriptionI18nKey: "pbac_desc_reset_password_organization_members",
    },
    editUsers: {
      i18nKey: "pbac_action_edit_users",
      descriptionI18nKey: "pbac_desc_edit_organization_users",
    },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_organization" },
  },
  [Resource.Booking]: {
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_bookings" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_bookings" },
    readTeamBookings: {
      i18nKey: "pbac_action_read_team_bookings",
      descriptionI18nKey: "pbac_desc_view_team_bookings",
    },
    readOrgBookings: {
      i18nKey: "pbac_action_read_org_bookings",
      descriptionI18nKey: "pbac_desc_view_organization_bookings",
    },
    readRecordings: {
      i18nKey: "pbac_action_read_recordings",
      descriptionI18nKey: "pbac_desc_view_booking_recordings",
    },
    readTeamAuditLogs: {
      i18nKey: "pbac_action_read_team_audit_logs",
      descriptionI18nKey: "pbac_desc_view_team_booking_audit_logs",
    },
    readOrgAuditLogs: {
      i18nKey: "pbac_action_read_org_audit_logs",
      descriptionI18nKey: "pbac_desc_view_organization_booking_audit_logs",
    },
  },
  [Resource.Insights]: {
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_team_insights" },
  },
  [Resource.Workflow]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_workflows" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_workflows" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_workflows" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_workflows" },
  },
  [Resource.Attributes]: {
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_organization_attributes" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_organization_attributes" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_organization_attributes" },
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_organization_attributes" },
    editUsers: { i18nKey: "pbac_action_edit_users", descriptionI18nKey: "pbac_desc_edit_user_attributes" },
  },
  [Resource.RoutingForm]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_routing_forms" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_routing_forms" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_routing_forms" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_routing_forms" },
  },
  [Resource.Webhook]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_webhooks" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_webhooks" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_webhooks" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_webhooks" },
  },
  [Resource.Availability]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_availability" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_availability" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_availability" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_availability" },
  },
  [Resource.OutOfOffice]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_out_of_office" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_out_of_office" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_out_of_office" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_out_of_office" },
  },
  [Resource.Watchlist]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_watchlist_entries" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_watchlist_entries" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_watchlist_entries" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_watchlist_entries" },
  },
  [Resource.FeatureOptIn]: {
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_feature_opt_in" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_feature_opt_in" },
  },
  [Resource.CustomDomain]: {
    create: { i18nKey: "pbac_action_create", descriptionI18nKey: "pbac_desc_create_custom_domain" },
    read: { i18nKey: "pbac_action_read", descriptionI18nKey: "pbac_desc_view_custom_domain" },
    update: { i18nKey: "pbac_action_update", descriptionI18nKey: "pbac_desc_update_custom_domain" },
    delete: { i18nKey: "pbac_action_delete", descriptionI18nKey: "pbac_desc_delete_custom_domain" },
  },
};

/** Look up the i18n label key for a resource. */
export function getResourceLabel(resource: Resource): string {
  return RESOURCE_LABELS[resource as keyof typeof PERMISSION_REGISTRY];
}

/** Look up the i18n label and description keys for a specific permission action. */
export function getPermissionLabel(
  resource: Resource,
  action: CrudAction | CustomAction
): PermissionLabel | undefined {
  const resourceLabels = PERMISSION_LABELS[resource] as
    | Partial<Record<CrudAction | CustomAction, PermissionLabel>>
    | undefined;
  return resourceLabels?.[action];
}
