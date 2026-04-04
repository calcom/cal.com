import prisma from "@calcom/prisma";
import type { EventType, Team, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listWithTeamHandler } from "./listWithTeam.handler";

let user1: User;
let user2: User;
let user3: User;
let team1: Team;
let team2: Team;
let team3: Team;
let eventType1: EventType;
let eventType2: EventType;
let eventType3: EventType;
let eventType4: EventType;
let managedParent: EventType;
let managedChild: EventType;
let teamEventNoUserId: EventType;

describe("listWithTeamHandler", () => {
  beforeAll(async () => {
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
    user3 = await prisma.user.create({
      data: {
        username: `testuser-lwt-3-${timestamp}`,
        email: `testuser-lwt-3-${timestamp}@example.com`,
        name: "Test User 3",
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

    team3 = await prisma.team.create({
      data: {
        name: "Team 3 lwt",
        slug: `team-3-lwt-${timestamp}`,
        members: {
          create: {
            userId: user1.id,
            role: MembershipRole.ADMIN,
            accepted: true,
          },
        },
      },
    });

    eventType1 = await prisma.eventType.create({
      data: {
        title: "User 1 Individual Event",
        slug: `user1-event-lwt-${timestamp}`,
        length: 30,
        userId: user1.id,
      },
    });

    eventType2 = await prisma.eventType.create({
      data: {
        title: "Team 1 Event (user1 owner + member)",
        slug: `team1-event-lwt-${timestamp}`,
        length: 30,
        teamId: team1.id,
        userId: user1.id,
      },
    });

    eventType3 = await prisma.eventType.create({
      data: {
        title: "User 2 Individual Event",
        slug: `user2-event-lwt-${timestamp}`,
        length: 30,
        userId: user2.id,
      },
    });

    eventType4 = await prisma.eventType.create({
      data: {
        title: "Team 2 Event (user2 owner, NOT member)",
        slug: `team2-event-lwt-${timestamp}`,
        length: 30,
        teamId: team2.id,
        userId: user2.id,
      },
    });

    managedParent = await prisma.eventType.create({
      data: {
        title: "Managed Parent Event",
        slug: `managed-parent-lwt-${timestamp}`,
        length: 45,
        teamId: team3.id,
        schedulingType: SchedulingType.MANAGED,
      },
    });

    managedChild = await prisma.eventType.create({
      data: {
        title: "Managed Child Event",
        slug: `managed-child-lwt-${timestamp}`,
        length: 45,
        userId: user1.id,
        parentId: managedParent.id,
      },
    });

    teamEventNoUserId = await prisma.eventType.create({
      data: {
        title: "Team 3 Event (no userId)",
        slug: `team3-nouserid-lwt-${timestamp}`,
        length: 60,
        teamId: team3.id,
      },
    });
  });

  afterAll(async () => {
    try {
      const eventTypeIds = [
        eventType1?.id,
        eventType2?.id,
        eventType3?.id,
        eventType4?.id,
        managedChild?.id,
        managedParent?.id,
        teamEventNoUserId?.id,
      ].filter(Boolean);
      if (eventTypeIds.length > 0) {
        await prisma.eventType.deleteMany({
          where: { id: { in: eventTypeIds } },
        });
      }
      const teamIds = [team1?.id, team2?.id, team3?.id].filter(Boolean);
      if (teamIds.length > 0) {
        await prisma.team.deleteMany({
          where: { id: { in: teamIds } },
        });
      }
      const userIds = [user1?.id, user2?.id, user3?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return user's own event types and team event types they are a member of", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user1.id } },
    });

    const resultIds = result.map((e) => e.id);
    expect(resultIds).toContain(eventType1.id);
    expect(resultIds).toContain(eventType2.id);

    const individualResult = result.find((e) => e.id === eventType1.id);
    expect(individualResult).toBeDefined();
    expect(individualResult?.title).toBe(eventType1.title);
    expect(individualResult?.slug).toBe(eventType1.slug);
    expect(individualResult?.team).toBeNull();

    const teamResult = result.find((e) => e.id === eventType2.id);
    expect(teamResult).toBeDefined();
    expect(teamResult?.title).toBe(eventType2.title);
    expect(teamResult?.slug).toBe(eventType2.slug);
    expect(teamResult?.team).toBeDefined();
    expect(teamResult?.team?.id).toBe(team1.id);
    expect(teamResult?.team?.name).toBe(team1.name);
  });

  it("should not return event types belonging to other users", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user1.id } },
    });

    const resultIds = result.map((e) => e.id);
    expect(resultIds).not.toContain(eventType3.id);
    expect(resultIds).not.toContain(eventType4.id);
  });

  it("should return team event types where userId is set but user has no membership", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user2.id } },
    });

    const resultIds = result.map((e) => e.id);
    expect(resultIds).toContain(eventType3.id);
    expect(resultIds).toContain(eventType4.id);

    const teamEventResult = result.find((e) => e.id === eventType4.id);
    expect(teamEventResult).toBeDefined();
    expect(teamEventResult?.team?.id).toBe(team2.id);
    expect(teamEventResult?.team?.name).toBe(team2.name);
  });

  it("should not duplicate events when user is both owner and team member", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user1.id } },
    });

    const eventType2Occurrences = result.filter((e) => e.id === eventType2.id);
    expect(eventType2Occurrences).toHaveLength(1);
  });

  it("should return managed event type children with userId set", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user1.id } },
    });

    const resultIds = result.map((e) => e.id);
    expect(resultIds).toContain(managedChild.id);

    const managedChildResult = result.find((e) => e.id === managedChild.id);
    expect(managedChildResult).toBeDefined();
    expect(managedChildResult?.title).toBe(managedChild.title);
    expect(managedChildResult?.team).toBeNull();
  });

  it("should return team event types without userId via membership", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user1.id } },
    });

    const resultIds = result.map((e) => e.id);
    expect(resultIds).toContain(teamEventNoUserId.id);

    const noUserIdResult = result.find((e) => e.id === teamEventNoUserId.id);
    expect(noUserIdResult).toBeDefined();
    expect(noUserIdResult?.team?.id).toBe(team3.id);
    expect(noUserIdResult?.team?.name).toBe(team3.name);
  });

  it("should populate username for individual event types and null for team event types", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user1.id } },
    });

    const individualResult = result.find((e) => e.id === eventType1.id);
    expect(individualResult?.username).toBe(user1.username);

    const teamResult = result.find((e) => e.id === eventType2.id);
    expect(teamResult?.username).toBeNull();

    const noUserIdTeamResult = result.find((e) => e.id === teamEventNoUserId.id);
    expect(noUserIdTeamResult?.username).toBeNull();
  });

  it("should return username for user2 individual events", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user2.id } },
    });

    const individualResult = result.find((e) => e.id === eventType3.id);
    expect(individualResult?.username).toBe(user2.username);

    const teamEventResult = result.find((e) => e.id === eventType4.id);
    expect(teamEventResult?.username).toBeNull();
  });

  it("should return empty array for user with no event types", async () => {
    const result = await listWithTeamHandler({
      ctx: { user: { id: user3.id } },
    });

    expect(result).toHaveLength(0);
  });

  it("should not return team events for users with unaccepted membership", async () => {
    const timestamp = Date.now();
    const pendingTeam = await prisma.team.create({
      data: {
        name: "Pending Team lwt",
        slug: `pending-team-lwt-${timestamp}`,
        members: {
          create: {
            userId: user3.id,
            role: MembershipRole.MEMBER,
            accepted: false,
          },
        },
      },
    });

    const pendingTeamEvent = await prisma.eventType.create({
      data: {
        title: "Pending Team Event",
        slug: `pending-team-event-lwt-${timestamp}`,
        length: 30,
        teamId: pendingTeam.id,
      },
    });

    try {
      const result = await listWithTeamHandler({
        ctx: { user: { id: user3.id } },
      });

      const resultIds = result.map((e) => e.id);
      expect(resultIds).not.toContain(pendingTeamEvent.id);
    } finally {
      await prisma.eventType.delete({ where: { id: pendingTeamEvent.id } });
      await prisma.team.delete({ where: { id: pendingTeam.id } });
    }
  });
});
