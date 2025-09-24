import type { EventTypeAssignedUsers, EventTypeHosts } from "../components/EventType";

// This function checks if EventType requires assignment.
// returns true: if EventType requires assignment but there is no assignment yet done by the user.
// returns false: for all other scenarios.
export function checkForEmptyAssignment({
  assignedUsers,
  hosts,
  isManagedEventType,
  assignAllTeamMembers,
}: {
  assignedUsers: EventTypeAssignedUsers;
  hosts: EventTypeHosts;
  isManagedEventType: boolean;
  assignAllTeamMembers: boolean;
}): boolean {
  // If Team-events have assignAllTeamMembers checked, return false as assignment is complete.
  if (assignAllTeamMembers) {
    return false;
  }

  // For managed eventtype check if assigned users are empty.
  // For non-managed eventtype check if hosts are empty.
  if (isManagedEventType ? assignedUsers.length === 0 : hosts.length === 0) {
    return true;
  }

  return false;
}
