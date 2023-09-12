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
  // If teamId is provided then we fetch membership users from that team

  const membershipUsers: number[] = [];
  if (teamId) {
    const memberships = await prisma.membership.findMany({ where: { teamId } });
    for (const membership of memberships) {
      if (!membership.userId) {
        // Do nothing
      } else {
        membershipUsers.push(membership.userId);
      }
    }
  }

  const eventTypesPromises: Promise<
    Prisma.EventTypeGetPayload<{
      select: {
        id: true;
        schedulingType: true;
        teamId: true;
      };
    }>
  >[] = [];

  for (let i = 0; i < 20; i++) {
    const schedulingType = randomSchedulingType();
    eventTypesPromises.push(
      prisma.eventType.create({
        data: {
          title: `${schedulingType.toLowerCase() ?? ""} Event Type ${i + 1} - ${
            teamId ? `Team ${teamId}` : ""
          }`,
          slug: `event-type-${teamId ? `team-${teamId}` : ""}${i + 1}`,
          userId: teamId ? null : userId,
          teamId: teamId ? teamId : null,
          length: 30,
          description: "This is a description",
          ...(teamId ? { schedulingType: schedulingType } : {}),
        },
      })
    );
  }

  const resultEventTypes = await Promise.all(eventTypesPromises);

  const updateRelationships: Promise<any>[] = [];
  for (const eventType of resultEventTypes) {
    const schedulingType = eventType.schedulingType;
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
          ...(schedulingType === "COLLECTIVE" || schedulingType === "ROUND_ROBIN"
            ? {
                hosts: {
                  create: membershipUsers.map((userId) => ({
                    userId,
                    isFixed: schedulingType === "COLLECTIVE" ? true : false,
                  })),
                },
              }
            : {}),
        },
      })
    );
  }
  await Promise.all(updateRelationships);
}

async function createManyTeams(userId: number) {
  const teamsPromises: Promise<
    Prisma.TeamGetPayload<{
      select: {
        id: true;
      };
    }>
  >[] = [];
  for (let i = 0; i < 20; i++) {
    teamsPromises.push(
      prisma.team.create({
        data: {
          name: `Team ${i + 1}`,
          slug: `team-${i + 1}`,
        },
      })
    );
  }

  const result = await Promise.all(teamsPromises);
  if (result.length > 0) {
    console.log(`👥 Created ${result.length} teams`);
  }
  const teamIds = result.map((team) => team.id);

  const usersForTeam = await createManyUsers();

  if (usersForTeam.length > 0) {
    console.log(`👥 Created ${usersForTeam.length} users for teams`);
  }

  // Create memberships for the user
  const memberships: Prisma.MembershipUncheckedCreateInput[] = [];

  for (const teamId of teamIds) {
    for (const userId of usersForTeam) {
      memberships.push({
        userId: userId,
        teamId: teamId,
        role: randomTeamRole(),
        accepted: true,
      });
    }
    // Add main user to all teams as Owner
    memberships.push({
      userId: userId,
      teamId: teamId,
      role: "OWNER",
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

async function createManyUsers() {
  const userPromises: Promise<
    Prisma.UserGetPayload<{
      select: { id: true };
    }>
  >[] = [];
  for (let i = 0; i < 20; i++) {
    userPromises.push(
      prisma.user.create({
        data: {
          username: `user-${i + 1}`,
          email: `user-${i + 1}`,
          password: "password",
          name: `User ${i + 1}`,
          role: randomUserRole(),
          completedOnboarding: true,
        },
      })
    );
  }

  const result = await Promise.all(userPromises);
  return result.map((user) => user.id);
}

createEventTypesForUserAndForTeams();

function randomUserRole(): any {
  const roles = ["USER", "ADMIN"];
  return roles[Math.floor(Math.random() * roles.length)];
}

function randomTeamRole(): any {
  const roles = ["ADMIN", "OWNER", "MEMBER"];
  return roles[Math.floor(Math.random() * roles.length)];
}

function randomSchedulingType(): any {
  const roles = ["MANAGED", "COLLECTIVE", "ROUND_ROBIN"];
  return roles[Math.floor(Math.random() * roles.length)];
}
