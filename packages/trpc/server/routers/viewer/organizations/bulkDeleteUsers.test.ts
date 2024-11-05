import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, it, beforeEach, vi, expect } from "vitest";

import type { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
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

describe("Bulk Delete Users handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`should only delete selected members`, async () => {
    const team = {
      id: 1,
      name: "Team 1",
      slug: "team-1",
    };

    const orgOwner = getOrganizer({
      id: 101,
      name: "teamOwner",
      email: "owner@user.com",
      ...getBaseUserInfo(team, 1, "OWNER"),
      organizationId: 1,
    });

    const userToBeRemoved1 = getOrganizer({
      id: 102,
      name: "memberUser1",
      email: "member1@user.com",
      ...getBaseUserInfo(team, 1, "MEMBER"),
    });

    const userToBeRemoved2 = getOrganizer({
      id: 103,
      name: "memberUser2",
      email: "member2@user.com",
      ...getBaseUserInfo(team, 1, "MEMBER"),
    });

    const userNotToBeRemoved = getOrganizer({
      id: 104,
      name: "memberUser3",
      email: "member3@user.com",
      ...getBaseUserInfo(team, 1, "MEMBER"),
    });

    await createBookingScenario(
      getScenarioData(
        {
          eventTypes: [],
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

    const remainingMemberships = await prismock.membership.findMany({
      where: {
        teamId: 1,
      },
      select: {
        userId: true,
      },
    });

    expect(remainingMemberships).toEqual([{ userId: orgOwner.id }, { userId: userNotToBeRemoved.id }]);

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

    const remainingProfiles = await prismock.profile.findMany({
      where: {
        organizationId: 1,
      },
      select: {
        userId: true,
      },
    });

    expect(remainingProfiles).toEqual([{ userId: orgOwner.id }, { userId: userNotToBeRemoved.id }]);
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it.todo("should remove managed event types of removed users", async () => {});

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
