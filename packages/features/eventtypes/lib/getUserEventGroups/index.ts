export { EventGroupBuilder } from "./EventGroupBuilder";
export type { EventGroupBuilderDependencies, EventGroupBuilderInput } from "./EventGroupBuilder";

export { EventTypeGroupFilter, filterEvents } from "./EventTypeGroupFilter";

export { ProfilePermissionProcessor } from "./ProfilePermissionProcessor";

export { TeamAccessUseCase } from "./teamAccessUseCase";

export { getUserEventGroupsData } from "./getUserEventGroupsData";
export type { GetUserEventGroupsDataInput } from "./getUserEventGroupsData";

export type { TeamPermissions, MembershipWithRole } from "./permissionUtils";
export {
  hasHigherPrivilege,
  getEffectiveRole,
  getTeamPermissions,
  buildTeamPermissionsMap,
} from "./permissionUtils";

export type { FilterContext, FiltersType } from "./filterUtils";
export { shouldListUserEvents, shouldIncludeTeamMembership, createTeamSlug } from "./filterUtils";

export type { EventTypeGroup, ProfileWithPermissions } from "./transformUtils";
export { createUserEventGroup, createTeamEventGroup, createProfilesWithPermissions } from "./transformUtils";
