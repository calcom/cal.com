import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";

import type { Host } from "~/event-types/views/event-types-single-view";

// This function checks if EventType requires assignment.
// returns true: if EventType requires assignment but there is no assignment yet done by the user.
// returns false: for all other scenarios.
export function checkForEmptyAssignment({
  assignedUsers,
  hosts,
  isManagedEventType,
  assignAllTeamMembers,
  isTeamEvent,
}: {
  assignedUsers: ChildrenEventType[];
  hosts: Host[];
  isManagedEventType: boolean;
  assignAllTeamMembers: boolean;
  isTeamEvent: boolean;
}): boolean {
  if (isTeamEvent && assignAllTeamMembers) {
    return false;
  } else if (
    isTeamEvent &&
    // For managed eventtype check if assigned users are empty.
    // For non-managed eventtype check if hosts are empty.
    (isManagedEventType ? assignedUsers.length === 0 : hosts.length === 0)
  ) {
    return true;
  }
  return false;
}
