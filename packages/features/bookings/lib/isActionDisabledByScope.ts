/**
 * Shared utility for scope-aware disable checks.
 *
 * When an event type has disableCancelling or disableRescheduling enabled,
 * the associated scope field (disableCancellingScope / disableReschedulingScope)
 * determines who is affected:
 *
 * - HOST_AND_ATTENDEE (default): both host and attendee are blocked
 * - ATTENDEE_ONLY: only attendees are blocked; hosts can still act
 *
 * This function returns `true` when the action should be blocked for the
 * current user.
 *
 * Important: The caller is responsible for computing `isHost` correctly.
 */
export function isActionDisabledByScope({
  disableFlag,
  scope,
  isHost,
}: {
  /** Whether the disable toggle is on (e.g. disableCancelling / disableRescheduling) */
  disableFlag: boolean | null | undefined;
  /** The scope enum value – HOST_AND_ATTENDEE or ATTENDEE_ONLY */
  scope: string | null | undefined;
  /** Whether the current user is a host / organizer of the booking (must account for all hosts in team events) */
  isHost: boolean;
}): boolean {
  if (!disableFlag) return false;
  if (scope === "ATTENDEE_ONLY" && isHost) return false;
  return true;
}
