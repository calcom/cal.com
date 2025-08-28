import prisma from "@calcom/prisma";

export async function getTeamIdFromEventType({
  eventType,
}: {
  eventType: { team: { id: number | null } | null; parentId: number | null };
}) {
  if (!eventType) {
    return null;
  }

  if (eventType?.team?.id) {
    return eventType.team.id;
  }

  // If it's a managed event we need to find the teamId for it from the parent
  if (eventType?.parentId) {
    const managedEvent = await prisma.eventType.findUnique({
      where: {
        id: eventType.parentId,
      },
      select: {
        teamId: true,
      },
    });

    return managedEvent?.teamId;
  }
}
