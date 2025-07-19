/**
 * It returns true only if there is actually some team members to route to at the moment.
 * This includes both active rerouting (with routedTeamMemberIds from new routing form) and
 * reschedule scenarios where we're preserving original routing logic.
 * But I think we should also consider the case where no routedTeamMemberIds is provided or it is null which is when we want to consider all the assigned members of the team event for rerouting.
 * So, it could be better to just read cal.rerouting query param instead of routedTeamMemberIds.
 */
export function isRerouting({
  rescheduleUid,
  routedTeamMemberIds,
}: {
  rescheduleUid: string | null;
  routedTeamMemberIds: number[] | null;
}) {
  return !!rescheduleUid && !!routedTeamMemberIds?.length;
}

/**
 * Returns true if this is an active rerouting scenario (not just preserving original routing logic during reschedule).
 * Active rerouting means the user is explicitly changing the routing via a new routing form submission.
 */
export function isActiveRerouting({
  rescheduleUid,
  routedTeamMemberIds,
  reroutingFormResponses,
}: {
  rescheduleUid: string | null;
  routedTeamMemberIds: number[] | null;
  reroutingFormResponses?: Record<string, any> | null;
}) {
  return !!rescheduleUid && !!routedTeamMemberIds?.length && !!reroutingFormResponses;
}

export function shouldIgnoreContactOwner({
  skipContactOwner,
  rescheduleUid,
  routedTeamMemberIds,
}: {
  skipContactOwner: boolean | null;
  rescheduleUid: string | null;
  routedTeamMemberIds: number[] | null;
}) {
  // During rerouting, we don't want to consider salesforce ownership as it could potentially choose a member that isn't part of routedTeamMemberIds and thus ending up with no available timeslots.
  return skipContactOwner || isRerouting({ rescheduleUid, routedTeamMemberIds });
}
