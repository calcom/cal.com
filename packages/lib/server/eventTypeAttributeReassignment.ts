import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { zodAttributesQueryValue } from "@calcom/lib/raqb/zod";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["eventTypeAttributeReassignment"] });

export async function reassignEventTypesBasedOnAttributes({
  orgId,
  affectedUserIds,
}: {
  orgId: number;
  affectedUserIds: number[];
}) {
  log.debug("Starting event type reassignment", { orgId, affectedUserIds });

  const eventTypesWithAttributeAssignment = await prisma.eventType.findMany({
    where: {
      team: {
        parentId: orgId,
      },
      assignRRMembersUsingSegment: true,
      rrSegmentQueryValue: {
        not: Prisma.JsonNull,
      },
    },
    select: {
      id: true,
      team: {
        select: {
          id: true,
          parentId: true,
        },
      },
      rrSegmentQueryValue: true,
      hosts: {
        select: {
          userId: true,
          isFixed: true,
          priority: true,
          weight: true,
          scheduleId: true,
        },
      },
    },
  });

  log.debug(`Found ${eventTypesWithAttributeAssignment.length} event types to reassign`);

  for (const eventType of eventTypesWithAttributeAssignment) {
    try {
      await reassignSingleEventType(eventType);
    } catch (error) {
      log.error(`Failed to reassign event type ${eventType.id}`, error);
    }
  }
}

async function reassignSingleEventType(eventType: {
  id: number;
  team: { id: number; parentId: number | null } | null;
  rrSegmentQueryValue: Prisma.JsonValue;
  hosts: {
    userId: number;
    isFixed: boolean;
    priority?: number | null;
    weight?: number | null;
    scheduleId?: number | null;
  }[];
}) {
  if (!eventType.team || !eventType.rrSegmentQueryValue) {
    return;
  }

  if (!eventType.team.parentId) {
    log.warn(`Event type ${eventType.id} has no parent organization, skipping`);
    return;
  }

  const parsedQueryValue = zodAttributesQueryValue.nullable().safeParse(eventType.rrSegmentQueryValue);
  if (!parsedQueryValue.success) {
    log.warn(`Invalid rrSegmentQueryValue for event type ${eventType.id}, skipping`);
    return;
  }

  const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic({
    attributesQueryValue: parsedQueryValue.data,
    teamId: eventType.team.id,
    orgId: eventType.team.parentId,
  });

  if (!teamMembersMatchingAttributeLogic) {
    const allTeamMemberIds = await MembershipRepository.findAllByTeamIds({
      teamIds: [eventType.team.id],
      select: { userId: true },
    });

    const newHosts = allTeamMemberIds.map((member: { userId: number }) => ({
      userId: member.userId,
      eventTypeId: eventType.id,
      isFixed: false,
      priority: 2,
      weight: 100,
    }));

    await updateEventTypeHosts(eventType.id, newHosts);
    return;
  }

  const matchingUserIds = teamMembersMatchingAttributeLogic.map((member) => member.userId);

  const existingHosts = eventType.hosts || [];
  const existingHostsMap = new Map(existingHosts.map((host) => [host.userId, host]));

  const newHosts = matchingUserIds.map((userId) => {
    const existingHost = existingHostsMap.get(userId);
    return {
      userId,
      eventTypeId: eventType.id,
      isFixed: existingHost?.isFixed ?? false,
      priority: existingHost?.priority ?? 2,
      weight: existingHost?.weight ?? 100,
      scheduleId: existingHost?.scheduleId ?? null,
    };
  });

  await updateEventTypeHosts(eventType.id, newHosts);
  log.debug(`Reassigned event type ${eventType.id} with ${newHosts.length} hosts`);
}

async function updateEventTypeHosts(
  eventTypeId: number,
  newHosts: {
    userId: number;
    eventTypeId: number;
    isFixed: boolean;
    priority: number;
    weight: number;
    scheduleId?: number | null;
  }[]
) {
  await prisma.$transaction(async (tx) => {
    await tx.host.deleteMany({
      where: {
        eventTypeId,
      },
    });

    if (newHosts.length > 0) {
      await tx.host.createMany({
        data: newHosts,
      });
    }
  });
}
