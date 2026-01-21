/**
 * Constructs the WHERE clause for Prisma booking findMany operation.
 *
 * @param userId - The ID of the user making the request. This is used to filter bookings where the user is either the host or an attendee.
 * @param attendeeEmails - An array of emails provided in the request for filtering bookings by attendee emails, used in case of Admin calls.
 * @param userIds - An array of user IDs to be included in the filter. Defaults to an empty array, and an array of user IDs in case of Admin call containing it.
 * @param userEmails - An array of user emails to be included in the filter if it is an Admin call and contains userId in query parameter. Defaults to an empty array.
 *
 * @returns An object that represents the WHERE clause for the findMany/findUnique operation.
 */
export function buildWhereClause(userId: number | null, attendeeEmails: string[], userIds: number[] = []) {
  const filterByAttendeeEmails = attendeeEmails.length > 0;
  const userFilter = userIds.length > 0 ? { userId: { in: userIds } } : userId ? { userId } : {};

  let whereClause = {};

  if (filterByAttendeeEmails) {
    whereClause = {
      AND: [
        userFilter,
        {
          attendees: {
            some: {
              email: { in: attendeeEmails },
            },
          },
        },
      ],
    };
  } else {
    whereClause = {
      ...userFilter,
    };
  }

  return whereClause;
}
