// Re-export from @calcom/features for backward compatibility
export {
  type TeamPermissions,
  type MembershipWithRole,
  hasHigherPrivilege,
  getEffectiveRole,
  getTeamPermissions,
  buildTeamPermissionsMap,
} from "@calcom/features/eventtypes/lib/getUserEventGroups";
