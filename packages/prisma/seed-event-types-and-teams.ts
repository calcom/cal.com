/**
 *  This script can be used to seed the database with a lot of data for performance testing.
 *  TODO: Make it more structured and configurable from CLI
 *  Run it as `npx ts-node --transpile-only ./seed-event-types-and-teams.ts`
 */
import type { Prisma } from "@prisma/client";

import prisma from ".";

async function createEventTypesForUserAndForTeams() {
  const selectedUser = await prisma.user.findFirst({
    where: {
      username: "teampro",
    },
  });

  if (!selectedUser) {
    throw new Error("No user found");
  }

  // Create randomized event types for the user
  await createManyEventTypes({ userId: selectedUser.id });

  // Create randomized event types for the teams
  await createManyTeams(selectedUser.id);
}

async function createManyEventTypes({ userId, teamId }: { userId?: number; teamId?: number }) {
  const eventTypes: Prisma.EventTypeUncheckedCreateInput[] = [];
  for (let i = 0; i < 20; i++) {
    eventTypes.push({
      title: `Event Type ${i + 1}`,
      slug: `event-type-${teamId ? `team-${teamId}` : ""}${i + 1}`,
      userId: teamId ? null : userId,
      teamId: teamId ? teamId : null,
      length: 30,
      description: "This is a description",
    });
  }

  await prisma.eventType.createMany({
    data: eventTypes,
  });

  // Load event types recently created
  const eventTypesFound = await prisma.eventType.findMany({
    where: {
      slug: {
        startsWith: `event-type-${teamId ? "teams-" : ""}`,
      },
    },
    select: {
      id: true,
    },
  });

  const updateRelationships: Promise<any>[] = [];
  for (const eventType of eventTypesFound) {
    updateRelationships.push(
      prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          users: {
            connect: {
              id: userId,
            },
          },
        },
      })
    );
  }
  await Promise.all(updateRelationships);
}

async function createManyTeams(userId: number) {
  const teams: Prisma.TeamUncheckedCreateInput[] = [];
  for (let i = 0; i < 20; i++) {
    teams.push({
      name: `Team ${i + 1}`,
      slug: `team-${i + 1}`,
    });
  }

  const createdTeams = await prisma.team.createMany({
    data: teams,
  });

  if (!createdTeams.count) {
    throw new Error("No team created");
  }

  // Load teams recently created
  const teamsFound = await prisma.team.findMany({
    where: {
      slug: {
        startsWith: "team-",
      },
    },
    select: {
      id: true,
    },
  });

  // Create memberships for the user
  const memberships: Prisma.MembershipUncheckedCreateInput[] = [];

  for (const team of teamsFound) {
    memberships.push({
      userId,
      teamId: team.id,
      role: "ADMIN",
      accepted: true,
    });
  }

  await prisma.membership.createMany({
    data: memberships,
  });

  // Create event Types for those teams
  // Load memberships
  const membershipsFound = await prisma.membership.findMany({
    where: {
      userId,
    },
    select: {
      teamId: true,
    },
  });

  if (!membershipsFound.length) {
    throw new Error("No memberships found");
  }

  for (const membership of membershipsFound) {
    await createManyEventTypes({ userId, teamId: membership.teamId });
  }
}

createEventTypesForUserAndForTeams();
