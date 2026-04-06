/**
 * Sanitizes organizer email from booking fields (cancelledBy, rescheduledBy)
 * when hideOrganizerEmail is enabled, preventing information disclosure.
 *
 * Returns a new object with the sanitized values rather than mutating the input.
 */
export function sanitizeOrganizerEmailFields({
  organizerEmails,
  cancelledBy,
  rescheduledBy,
}: {
  organizerEmails: (string | null | undefined)[];
  cancelledBy: string | null;
  rescheduledBy: string | null;
}): { cancelledBy: string | null; rescheduledBy: string | null } {
  const isOrganizerEmail = (email: string) =>
    organizerEmails.some((organizerEmail) => organizerEmail != null && organizerEmail === email);

  return {
    cancelledBy: cancelledBy && isOrganizerEmail(cancelledBy) ? null : cancelledBy,
    rescheduledBy: rescheduledBy && isOrganizerEmail(rescheduledBy) ? null : rescheduledBy,
  };
}
