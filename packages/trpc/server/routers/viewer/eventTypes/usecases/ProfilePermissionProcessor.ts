import type { TeamPermissions } from "../utils/permissionUtils";
import {
  createProfilesWithPermissions,
  type EventTypeGroup,
  type ProfileWithPermissions,
} from "../utils/transformUtils";

export class ProfilePermissionProcessor {
  processProfiles(
    eventTypeGroups: EventTypeGroup[],
    teamPermissionsMap: Map<number, TeamPermissions>
  ): ProfileWithPermissions[] {
    return createProfilesWithPermissions(eventTypeGroups, teamPermissionsMap);
  }
}
