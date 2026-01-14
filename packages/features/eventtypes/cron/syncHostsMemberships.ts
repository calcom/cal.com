import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["cron/syncHostsMemberships"] });

function validateRequest(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  return null;
}

type SyncResult = {
  hostsAdded: number;
  hostsRemoved: number;
  eventTypesProcessed: number;
  details: {
    eventTypeId: number;
    teamId: number;
    organizationId: number | null;
    added: { userId: number; membershipId: number }[];
    removed: { userId: number }[];
  }[];
};

async function syncHostsWithMemberships(): Promise<SyncResult> {
  const result: SyncResult = {
    hostsAdded: 0,
    hostsRemoved: 0,
    eventTypesProcessed: 0,
    details: [],
  };

  const eventTypesWithAssignAllTeamMembers = await prisma.eventType.findMany({
    where: {
      assignAllTeamMembers: true,
      teamId: { not: null },
      schedulingType: {
        in: [SchedulingType.ROUND_ROBIN, SchedulingType.COLLECTIVE],
      },
    },
    select: {
      id: true,
      teamId: true,
      schedulingType: true,
      hosts: {
        select: {
          userId: true,
        },
      },
      team: {
        select: {
          id: true,
          parentId: true,
          members: {
            where: {
              accepted: true,
            },
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  for (const eventType of eventTypesWithAssignAllTeamMembers) {
    if (!eventType.team || !eventType.teamId) continue;

    const teamMembers = eventType.team.members;
    const currentHosts = eventType.hosts;
    const organizationId = eventType.team.parentId;

    const teamMemberUserIds = new Set(teamMembers.map((m) => m.userId));
    const currentHostUserIds = new Set(currentHosts.map((h) => h.userId));

    const missingHostUserIds = teamMembers.filter((m) => !currentHostUserIds.has(m.userId));
    const orphanedHostUserIds = currentHosts.filter((h) => !teamMemberUserIds.has(h.userId));

    if (missingHostUserIds.length === 0 && orphanedHostUserIds.length === 0) {
      continue;
    }

    result.eventTypesProcessed++;

    const eventTypeDetail: SyncResult["details"][number] = {
      eventTypeId: eventType.id,
      teamId: eventType.teamId,
      organizationId,
      added: [],
      removed: [],
    };

    if (missingHostUserIds.length > 0) {
      const isFixed = eventType.schedulingType === SchedulingType.COLLECTIVE;

      await prisma.host.createMany({
        data: missingHostUserIds.map((member) => ({
          userId: member.userId,
          eventTypeId: eventType.id,
          isFixed,
        })),
        skipDuplicates: true,
      });

      for (const member of missingHostUserIds) {
        log.info("Added missing host to event type with assignAllTeamMembers=true", {
          eventTypeId: eventType.id,
          teamId: eventType.teamId,
          organizationId,
          userId: member.userId,
          membershipId: member.id,
        });
        eventTypeDetail.added.push({ userId: member.userId, membershipId: member.id });
        result.hostsAdded++;
      }
    }

    if (orphanedHostUserIds.length > 0) {
      await prisma.host.deleteMany({
        where: {
          eventTypeId: eventType.id,
          userId: {
            in: orphanedHostUserIds.map((h) => h.userId),
          },
        },
      });

      for (const host of orphanedHostUserIds) {
        log.info("Removed orphaned host from event type with assignAllTeamMembers=true", {
          eventTypeId: eventType.id,
          teamId: eventType.teamId,
          organizationId,
          userId: host.userId,
        });
        eventTypeDetail.removed.push({ userId: host.userId });
        result.hostsRemoved++;
      }
    }

    result.details.push(eventTypeDetail);
  }

  return result;
}

export async function handleSyncHostsMemberships(request: NextRequest) {
  const authError = validateRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const result = await syncHostsWithMemberships();

    log.info("Sync hosts memberships cron completed", {
      hostsAdded: result.hostsAdded,
      hostsRemoved: result.hostsRemoved,
      eventTypesProcessed: result.eventTypesProcessed,
    });

    return NextResponse.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    log.error("Error during sync hosts memberships cron:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to sync hosts with memberships" },
      { status: 500 }
    );
  }
}

export { syncHostsWithMemberships };
