import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

/**
 * Creates a team event type and assigns all team members as hosts
 * @param teamId - The team ID
 * @param eventType - Event type data to create
 * @returns The created event type
 */
export async function createRoundRobinTeamEventType({
  teamId,
  eventType,
}: {
  teamId: number;
  eventType: Prisma.EventTypeCreateInput;
}) {
  const createdEventType = await prisma.eventType.create({
    data: {
      ...eventType,
      team: {
        connect: {
          id: teamId,
        },
      },
    },
    include: {
      team: true,
    },
  });

  const teamMemberships = await prisma.membership.findMany({
    where: {
      teamId,
    },
  });

  // Add all team members as hosts (excluding the current user who's already added)
  for (const membership of teamMemberships) {
    await prisma.host.create({
      data: {
        userId: membership.userId,
        eventTypeId: createdEventType.id,
        isFixed: false, // ROUND_ROBIN scheduling type
      },
    });
  }

  return createdEventType;
}
