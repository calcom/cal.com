import type { TeamPermissions } from "./permissionUtils";
import { createProfilesWithPermissions, type EventTypeGroup, type ProfileWithPermissions } from "./transformUtils";

export class ProfilePermissionProcessor {
  processProfiles(
    eventTypeGroups: EventTypeGroup[],
    teamPermissionsMap: Map<number, TeamPermissions>
  ): ProfileWithPermissions[] {
    return createProfilesWithPermissions(eventTypeGroups, teamPermissionsMap);
  }
}
