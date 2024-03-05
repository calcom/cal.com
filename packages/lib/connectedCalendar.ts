import prisma from "@calcom/prisma";

export async function renewSelectedCalendarCredentialId(
  selectedCalendarWhereUnique: {
    userId: number;
    integration: string;
    externalId: string;
  },
  credentialId: number
): Promise<boolean> /* True if renewed, false if not */ {
  const selectedCalendar = await prisma.selectedCalendar.findFirst({
    where: {
      ...selectedCalendarWhereUnique,
      credentialId: null,
    },
  });
  if (selectedCalendar) {
    await prisma.selectedCalendar.update({
      where: {
        userId_integration_externalId: selectedCalendarWhereUnique,
      },
      data: {
        credentialId: credentialId,
      },
    });
    return true;
  }
  return false;
}
