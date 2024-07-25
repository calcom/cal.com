import type { SchedulingType } from "@calcom/prisma/enums";

import type { EventTypeAssignedUsers, EventTypeHosts } from "~/event-types/views/event-types-single-view";

// This function checks if EventType requires assignment.
// returns true: if EventType requires assignment but there is no assignment yet done by the user.
// returns false: for all other scenarios.
export function hasEmptyAssignment({
  assignedUsers,
  hosts,
  schedulingType,
  assignAllTeamMembers,
  isTeamEvent,
}: {
  assignedUsers: EventTypeAssignedUsers;
  hosts: EventTypeHosts;
  schedulingType: SchedulingType | null;
  assignAllTeamMembers: boolean;
  isTeamEvent: boolean;
}): boolean {
  // if Non-Team event, no need to check for assignments.
  if (!isTeamEvent) {
    return false;
  }

  // Team-events
  // If Team-events have assignAllTeamMembers checked, return false as assignemnt is complete.
  if (assignAllTeamMembers) {
    return false;
  }

  // For Managed EventType, check if assigned users are empty.
  if (schedulingType === "MANAGED" && assignedUsers.length === 0) {
    return true;
  }

  // For Non-Managed EventType (i.e RoundRobin or Collective), check if hosts are empty.
  if ((schedulingType === "ROUND_ROBIN" || schedulingType === "COLLECTIVE") && hosts.length === 0) {
    return true;
  }

  return false;
}
