import { describe, it, expect, afterAll, beforeAll } from "vitest";

import prisma from "@calcom/prisma";
import type { User, Team, EventType } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { listWithTeamHandler } from "./listWithTeam.handler";

let user1: User;
let user2: User;
let team1: Team;
let team2: Team;
let eventType1: EventType;
let eventType2: EventType;
let eventType3: EventType;
let eventType4: EventType;

describe("listWithTeamHandler", () => {
  beforeAll(async () => {
    // Create users, teams and event types
    const timestamp = Date.now();
    user1 = await prisma.user.create({
      data: {
        username: `testuser-lwt-1-${timestamp}`,
        email: `testuser-lwt-1-${timestamp}@example.com`,
        name: "Test User 1",
      },
    });
    user2 = await prisma.user.create({
      data: {
        username: `testuser-lwt-2-${timestamp}`,
        email: `testuser-lwt-2-${timestamp}@example.com`,
        name: "Test User 2",
      },
    });

    team1 = await prisma.team.create({
      data: {
        name: "Team 1 lwt",
        slug: `team-1-lwt-${timestamp}`,
        members: {
          create: {
            userId: user1.id,
            role: MembershipRole.MEMBER,
            accepted: true,
          },
        },
      },
    });

    team2 = await prisma.team.create({
      data: {
        name: "Team 2 lwt",
        slug: `team-2-lwt-${timestamp}`,
      },
    });

    eventType1 = await prisma.eventType.create({
      data: {
        title: "User 1 Event",
        slug: `user1-event-lwt-${timestamp}`,
        length: 30,
        userId: user1.id,
      },
    });

    eventType2 = await prisma.eventType.create({
      data: {
        title: "Team 1 Event",
        slug: `team1-event-lwt-${timestamp}`,
        length: 30,
        teamId: team1.id,
        userId: user1.id,
      },
    });

    eventType3 = await prisma.eventType.create({
      data: {
        title: "User 2 Event",
        slug: `user2-event-lwt-${timestamp}`,
        length: 30,
        userId: user2.id,
      },
    });

    eventType4 = await prisma.eventType.create({
      data: {
        title: "Team 2 Event",
        slug: `team2-event-lwt-${timestamp}`,
        length: 30,
        teamId: team2.id,
        userId: user2.id,
      },
    });
  });

  afterAll(async () => {
    try {
      if (eventType1?.id || eventType2?.id || eventType3?.id || eventType4?.id) {
        await prisma.eventType.deleteMany({
          where: {
            id: {
              in: [eventType1?.id, eventType2?.id, eventType3?.id, eventType4?.id].filter(Boolean),
            },
          },
        });
      }
      if (team1?.id || team2?.id) {
        await prisma.team.deleteMany({
          where: {
            id: {
              in: [team1?.id, team2?.id].filter(Boolean),
            },
          },
        });
      }
      if (user1?.id || user2?.id) {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: [user1?.id, user2?.id].filter(Boolean),
            },
          },
        });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return user's own event types and event types of teams they are a member of", async () => {
    const result = await listWithTeamHandler({
      ctx: {
        // we only need the id from the user object
        user: { id: user1.id } as any,
      },
    });

    expect(result).toHaveLength(2);

    const resultIds = result.map((e) => e.id);
    expect(resultIds).toContain(eventType1.id);
    expect(resultIds).toContain(eventType2.id);

    const eventType1Result = result.find((e) => e.id === eventType1.id);
    expect(eventType1Result).toBeDefined();
    expect(eventType1Result?.title).toBe(eventType1.title);
    expect(eventType1Result?.slug).toBe(eventType1.slug);
    expect(eventType1Result?.team).toBeNull();

    const eventType2Result = result.find((e) => e.id === eventType2.id);
    expect(eventType2Result).toBeDefined();
    expect(eventType2Result?.title).toBe(eventType2.title);
    expect(eventType2Result?.slug).toBe(eventType2.slug);
    expect(eventType2Result?.team).toBeDefined();
    expect(eventType2Result?.team?.id).toBe(team1.id);
    expect(eventType2Result?.team?.name).toBe(team1.name);
  });
});
