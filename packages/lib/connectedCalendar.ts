import prisma from "@calcom/prisma";

/**
 * Will update all the selected calendars with the same userId, integration and externalId including user-level and event-type-level calendars with new credentialId
 */
export async function renewSelectedCalendarCredentialId(
  selectedCalendarWhereUnique: {
    userId: number;
    integration: string;
    externalId: string;
  },
  credentialId: number
): Promise<boolean> /* True if renewed, false if not */ {
  // There could be multiple calendars because same combination could be used across multiple events as event-type-level calendars
  const selectedCalendars = await prisma.selectedCalendar.findMany({
    where: {
      ...selectedCalendarWhereUnique,
      credentialId: null,
    },
  });

  if (!selectedCalendars.length) return false;

  await prisma.selectedCalendar.updateMany({
    where: {
      id: {
        in: selectedCalendars.map((selectedCalendar) => selectedCalendar.id),
      },
    },
    data: {
      credentialId: credentialId,
    },
  });

  return true;
}
