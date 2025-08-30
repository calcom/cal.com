/**
 * Checks if a user is a host of a booking
 * @param userId - The ID of the user to check
 * @param bookingInfo - The booking information containing user and attendees
 * @param eventType - The event type containing users and hosts
 * @returns boolean - True if the user is a host, false otherwise
 */
export function checkIfUserIsHost(
  userId?: number | null,
  bookingInfo?: {
    user?: { id: number } | null;
    attendees?: { email: string }[];
  } | null,
  eventType?: {
    users?: { id: number; email: string }[];
    hosts?: { user: { id: number; email: string } }[];
  }
): boolean {
  if (!userId || !bookingInfo) return false;

  if (bookingInfo.user?.id === userId) return true;

  if (!bookingInfo.attendees || !eventType) return false;

  const attendeeEmails = new Set(bookingInfo.attendees.map((attendee) => attendee.email));

  if (eventType.users) {
    const isUserAndAttendee = eventType.users.some(
      (user) => user.id === userId && user.email && attendeeEmails.has(user.email)
    );
    if (isUserAndAttendee) return true;
  }

  if (eventType.hosts) {
    const isHostAndAttendee = eventType.hosts.some(
      ({ user }) => user.id === userId && user.email && attendeeEmails.has(user.email)
    );
    if (isHostAndAttendee) return true;
  }

  return false;
}
