/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: Bring this test back with the correct setup (no illegal imports)
import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../types";
import { bulkDeleteUsersHandler } from "./bulkDeleteUsers.handler";

const getBaseUserInfo = (
  team: { id: number; name: string; slug: string },
  orgId: number,
  role: MembershipRole
): Pick<
  ReturnType<typeof getOrganizer>,
  "teams" | "organizationId" | "schedules" | "completedOnboarding"
> => {
  return {
    completedOnboarding: true,
    organizationId: orgId,
    schedules: [TestData.schedules.IstWorkHours],
    teams: [
      {
        membership: {
          role,
          accepted: true,
        },
        team,
      },
    ],
  };
};

describe.skip("Bulk Delete Users handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`should:
        1: Remove memberships of users
        2: Update user info
        3: Remove profiles of users
        4: Not remove user events of removed users
        5: Remove host assignment from child team events of removed users
        6: Remove managed events of removed users
    `, async () => {
    const org = {
      id: 1,
      name: "Parent org",
      slug: "parent-org",
    };

    await addTeamsToDb([org]);

    const team = {
      id: 2,
      name: "Team 1",
      slug: "team-1",
      parentId: org.id,
    };

    const orgOwner = getOrganizer({
      id: 101,
      name: "teamOwner",
      email: "owner@user.com",
      ...getBaseUserInfo(team, org.id, "OWNER"),
      organizationId: 1,
    });

    await prismock.membership.create({
      data: {
        userId: orgOwner.id,
        teamId: 1,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    const userToBeRemoved1 = getOrganizer({
      id: 102,
      name: "memberUser1",
      email: "member1@user.com",
      ...getBaseUserInfo(team, org.id, "MEMBER"),
    });

    const userToBeRemoved1Event1: ScenarioData["eventTypes"][0] = {
      id: 1,
      title: "User 1 Event 1",
      slug: "user1-event1",
      slotInterval: 30,
      length: 30,
      userId: userToBeRemoved1.id,
    };

    const userToBeRemoved2 = getOrganizer({
      id: 103,
      name: "memberUser2",
      email: "member2@user.com",
      ...getBaseUserInfo(team, org.id, "MEMBER"),
    });

    const userToBeRemoved2Event1: ScenarioData["eventTypes"][0] = {
      id: 2,
      title: "User 2 Event 1",
      slug: "user2-event1",
      slotInterval: 30,
      length: 30,
      userId: userToBeRemoved2.id,
    };

    const userNotToBeRemoved = getOrganizer({
      id: 104,
      name: "memberUser3",
      email: "member3@user.com",
      ...getBaseUserInfo(team, org.id, "MEMBER"),
    });

    const userNotToBeRemovedEvent1: ScenarioData["eventTypes"][0] = {
      id: 3,
      title: "User 3 Event 1",
      slug: "user3-event1",
      slotInterval: 30,
      length: 30,
      userId: userNotToBeRemoved.id,
    };

    const roundRobinEvent: ScenarioData["eventTypes"][0] = {
      id: 4,
      title: "Round Robin Event",
      slug: "round-robin-event",
      schedulingType: "ROUND_ROBIN",
      slotInterval: 30,
      length: 30,
      teamId: team.id,
      hosts: [
        {
          userId: userToBeRemoved1.id,
        },
        {
          userId: userToBeRemoved2.id,
        },
        {
          userId: orgOwner.id,
        },
        {
          userId: userNotToBeRemoved.id,
        },
      ],
    };

    const parentManagedEvent: ScenarioData["eventTypes"][0] = {
      id: 5,
      title: "Parent Managed Event",
      slug: "parent-managed-event",
      teamId: team.id,
      slotInterval: 30,
      length: 30,
    };

    const user1ToBeRemovedManagedEvent: ScenarioData["eventTypes"][0] = {
      id: 6,
      title: "User 1 Managed Event",
      slug: "user1-managed-event",
      slotInterval: 30,
      length: 30,
      userId: userToBeRemoved1.id,
      parent: {
        id: parentManagedEvent.id,
      },
    };

    const user2ToBeRemovedManagedEvent: ScenarioData["eventTypes"][0] = {
      id: 7,
      title: "User 2 Managed Event",
      slug: "user2-managed-event",
      slotInterval: 30,
      length: 30,
      userId: userToBeRemoved2.id,
      parent: {
        id: parentManagedEvent.id,
      },
    };

    const userNotToBeRemovedManagedEvent: ScenarioData["eventTypes"][0] = {
      id: 8,
      title: "User 3 Managed Event",
      slug: "user3-managed-event",
      slotInterval: 30,
      length: 30,
      userId: userNotToBeRemoved.id,
      parent: {
        id: parentManagedEvent.id,
      },
    };

    parentManagedEvent.children = {
      connect: [
        {
          id: user1ToBeRemovedManagedEvent.id,
        },
        {
          id: user2ToBeRemovedManagedEvent.id,
        },
        {
          id: userNotToBeRemovedManagedEvent.id,
        },
      ],
    };

    await createBookingScenario(
      getScenarioData(
        {
          eventTypes: [
            userToBeRemoved1Event1,
            userToBeRemoved2Event1,
            roundRobinEvent,
            parentManagedEvent,
            user1ToBeRemovedManagedEvent,
            user2ToBeRemovedManagedEvent,
            userNotToBeRemovedManagedEvent,
            userNotToBeRemovedEvent1,
          ],
          organizer: orgOwner,
          usersApartFromOrganizer: [userToBeRemoved1, userToBeRemoved2, userNotToBeRemoved],
        },
        { id: 1 }
      )
    );

    const { id, name, organizationId } = orgOwner;

    const ctx = {
      user: {
        id,
        name,
        organizationId,
      } as NonNullable<TrpcSessionUser>,
    };

    const membersToRemove = [userToBeRemoved2.id, userToBeRemoved1.id];

    const res = await bulkDeleteUsersHandler({
      ctx,
      input: {
        userIds: membersToRemove,
      },
    });

    expect(res.success).toBe(true);
    expect(res.usersDeleted).toBe(2);

    //Memberships of removed users should be deleted
    const remainingMemberships = await prismock.membership.findMany({
      where: {
        teamId: team.id,
      },
      select: {
        userId: true,
      },
    });
    expect(remainingMemberships).toEqual([{ userId: orgOwner.id }, { userId: userNotToBeRemoved.id }]);

    //User info should be updated of removed users
    const removedUsers = await prismock.user.findMany({
      where: {
        id: {
          in: membersToRemove,
        },
      },
      select: {
        id: true,
        organizationId: true,
        username: true,
        completedOnboarding: true,
      },
    });
    expect(removedUsers).toEqual([
      {
        organizationId: null,
        id: userToBeRemoved1.id,
        username: null,
        completedOnboarding: false,
      },
      {
        id: userToBeRemoved2.id,
        organizationId: null,
        username: null,
        completedOnboarding: false,
      },
    ]);

    //Only the profiles of the removed users should be removed
    const remainingProfiles = await prismock.profile.findMany({
      where: {
        organizationId: org.id,
      },
      select: {
        userId: true,
      },
    });
    expect(remainingProfiles).toEqual([{ userId: orgOwner.id }, { userId: userNotToBeRemoved.id }]);

    //User events of org members should not be removed
    const userEvents = await prismock.eventType.findMany({
      where: {
        userId: {
          in: [...membersToRemove, userNotToBeRemoved.id],
        },
        teamId: null,
        parentId: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });
    expect(userEvents.length).toBe(3);

    // Host assignment from child team events of removed users should be deleted
    const teamEvent = await prismock.eventType.findFirst({
      where: {
        id: roundRobinEvent.id,
      },
      select: {
        hosts: {
          select: {
            userId: true,
          },
        },
      },
    });
    expect(teamEvent?.hosts.length).toBe(2);

    //Managed events of removed users should be deleted
    const managedEvents = await prismock.eventType.findMany({
      where: {
        parent: {
          id: parentManagedEvent.id,
        },
      },
      select: {
        id: true,
      },
    });
    expect(managedEvents).toEqual([{ id: userNotToBeRemovedManagedEvent.id }]);
  });

  it("should throw error when user is not ADMIN/OWNER of the organization", async () => {
    const team = {
      id: 1,
      name: "Test Team",
      slug: "test-team",
    };

    const memberUser = getOrganizer({
      id: 101,
      name: "memberUser",
      email: "member@user.com",
      ...getBaseUserInfo(team, 1, "MEMBER"),
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
          },
        ],
        organizer: memberUser,
      })
    );

    const { id, name, organizationId } = memberUser;

    const ctx = {
      user: {
        id,
        name,
        organizationId,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      bulkDeleteUsersHandler({
        ctx: ctx,
        input: {
          userIds: [],
        },
      })
    ).rejects.toThrowError("UNAUTHORIZED");
  });
});
