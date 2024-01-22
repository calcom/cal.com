import prisma from "@calcom/prisma";

export const checkDuplicateCalendar = async (userId: number, externalId: string, integration: string) => {
  const existingCalendar = await prisma.selectedCalendar.findUnique({
    where: {
      userId_integration_externalId: {
        userId,
        externalId,
        integration,
      },
    },
  });

  return existingCalendar;
};
