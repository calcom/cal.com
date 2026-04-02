import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import type { TeamPermissions } from "./permissionUtils";
import type { EventTypeGroup } from "./transformUtils";

export class EventTypeGroupFilter {
  private groups: EventTypeGroup[];
  private permissionsMap: Map<number, TeamPermissions>;

  constructor(groups: EventTypeGroup[], permissionsMap: Map<number, TeamPermissions>) {
    this.groups = groups;
    this.permissionsMap = permissionsMap;
  }

  /**
   * Filter event type groups by permission
   * @param permission - Permission to check (e.g., "eventType.read", "eventType.create", "eventType.update", "eventType.delete")
   * @returns New EventTypeGroupFilter instance with filtered groups
   */
  has(permission: PermissionString): EventTypeGroupFilter {
    const filteredGroups = this.groups.filter((group) => {
      // For user groups (no teamId), they have all permissions
      if (!group.teamId) {
        return true;
      }

      const permissions = this.permissionsMap.get(group.teamId);
      if (!permissions) {
        return false;
      }

      switch (permission) {
        case "eventType.read":
          // All groups with permissions can read
          return permissions.canRead;
        case "eventType.create":
          return permissions.canCreate;
        case "eventType.update":
          return permissions.canEdit;
        case "eventType.delete":
          return permissions.canDelete;
        default:
          return false;
      }
    });

    return new EventTypeGroupFilter(filteredGroups, this.permissionsMap);
  }

  /**
   * Filter by team ID
   * @param teamId - Team ID to filter by
   * @returns New EventTypeGroupFilter instance with filtered groups
   */
  byTeam(teamId: number): EventTypeGroupFilter {
    const filteredGroups = this.groups.filter((group) => group.teamId === teamId);
    return new EventTypeGroupFilter(filteredGroups, this.permissionsMap);
  }

  /**
   * Filter by user groups only (no team)
   * @returns New EventTypeGroupFilter instance with user groups only
   */
  userOnly(): EventTypeGroupFilter {
    const filteredGroups = this.groups.filter((group) => !group.teamId);
    return new EventTypeGroupFilter(filteredGroups, this.permissionsMap);
  }

  /**
   * Filter by team groups only (exclude user groups)
   * @returns New EventTypeGroupFilter instance with team groups only
   */
  teamsOnly(): EventTypeGroupFilter {
    const filteredGroups = this.groups.filter((group) => group.teamId);
    return new EventTypeGroupFilter(filteredGroups, this.permissionsMap);
  }

  /**
   * Filter by read-only status
   * @param readOnly - Whether to include only read-only or writable groups
   * @returns New EventTypeGroupFilter instance with filtered groups
   */
  readOnly(readOnly: boolean): EventTypeGroupFilter {
    const filteredGroups = this.groups.filter((group) => group.metadata.readOnly === readOnly);
    return new EventTypeGroupFilter(filteredGroups, this.permissionsMap);
  }

  /**
   * Get the filtered results
   * @returns Array of filtered EventTypeGroup objects
   */
  get(): EventTypeGroup[] {
    return this.groups;
  }

  /**
   * Get the count of filtered groups
   * @returns Number of groups after filtering
   */
  count(): number {
    return this.groups.length;
  }

  /**
   * Check if any groups match the current filter
   * @returns Boolean indicating if any groups exist
   */
  exists(): boolean {
    return this.groups.length > 0;
  }
}

/**
 * Create a new EventTypeGroupFilter instance
 * @param groups - Array of EventTypeGroup objects
 * @param permissionsMap - Map of team permissions
 * @returns EventTypeGroupFilter instance for chaining
 */
export function filterEvents(
  groups: EventTypeGroup[],
  permissionsMap: Map<number, TeamPermissions>
): EventTypeGroupFilter {
  return new EventTypeGroupFilter(groups, permissionsMap);
}
