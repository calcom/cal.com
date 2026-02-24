// This function checks if EventType requires assignment.
// returns true: if EventType requires assignment but there is no assignment yet done by the user.
// returns false: for all other scenarios.
export function checkForEmptyAssignment({
  childrenCount,
  hostCount,
  isManagedEventType,
  assignAllTeamMembers,
}: {
  childrenCount: number;
  hostCount: number;
  isManagedEventType: boolean;
  assignAllTeamMembers: boolean;
}): boolean {
  // If Team-events have assignAllTeamMembers checked, return false as assignment is complete.
  if (assignAllTeamMembers) {
    return false;
  }

  // For managed eventtype check if assigned users are empty.
  // For non-managed eventtype check if hosts are empty.
  if (isManagedEventType ? childrenCount === 0 : hostCount === 0) {
    return true;
  }

  return false;
}
