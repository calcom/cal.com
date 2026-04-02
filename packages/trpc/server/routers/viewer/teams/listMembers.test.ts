import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../types";
import listMembers from "./listMembers.handler";

vi.mock("@calcom/prisma", () => {
  return {
    prisma: vi.fn(),
  };
});

// TODO: Bring this back but without test dependencies in @calcom/web
const createTeamWithMembers = async ({ isPrivate = false }: { isPrivate?: boolean }) => {
  const team = {
    id: 1,
    name: "Team 1",
    slug: "team-1",
    isPrivate,
  };

  const organizer = getOrganizer({
    name: "Organizer",
    email: "organizer@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
    teams: [
      {
        membership: {
          role: "ADMIN",
          accepted: true,
        },
        team,
      },
    ],
  });

  const user2 = getOrganizer({
    name: "User 2",
    email: "user2@example.com",
    id: 102,
    schedules: [TestData.schedules.IstWorkHours],
    teams: [
      {
        membership: {
          role: "MEMBER",
          accepted: true,
        },
        team,
      },
    ],
  });

  const user3 = getOrganizer({
    name: "User 3",
    email: "user3@example.com",
    id: 103,
    schedules: [TestData.schedules.IstWorkHours],
    teams: [
      {
        membership: {
          role: "MEMBER",
          accepted: true,
        },
        team,
      },
    ],
  });

  await createBookingScenario(
    getScenarioData({
      eventTypes: [
        {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      organizer,
      usersApartFromOrganizer: [user2, user3],
    })
  );

  return {
    team,
    organizer,
    user2,
    user3,
  };
};

describe.skip("listMembers", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should return team members for teams", async () => {
    const { team, organizer, user2, user3 } = await createTeamWithMembers({ isPrivate: false });

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    const result = await listMembers({
      ctx,
      input: {
        teamId: team.id,
        limit: 10,
      },
    });

    expect(result.members).toEqual([
      expect.objectContaining({
        id: organizer.id,
        name: organizer.name,
        username: organizer.username,
      }),
      expect.objectContaining({
        id: user2.id,
        name: user2.name,
        username: user2.username,
      }),
      expect.objectContaining({
        id: user3.id,
        name: user3.name,
        username: user3.username,
      }),
    ]);
  });

  it("should return team members for private teams", async () => {
    const { team, organizer, user2, user3 } = await createTeamWithMembers({ isPrivate: true });

    //Logged in user is admin of the team
    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    const result = await listMembers({
      ctx,
      input: {
        teamId: team.id,
        limit: 10,
      },
    });

    expect(result.members).toEqual([
      expect.objectContaining({
        id: organizer.id,
        name: organizer.name,
        username: organizer.username,
      }),
      expect.objectContaining({
        id: user2.id,
        name: user2.name,
        username: user2.username,
      }),
      expect.objectContaining({
        id: user3.id,
        name: user3.name,
        username: user3.username,
      }),
    ]);
  });

  it("should throw error if user is not admin/owner of the private team", async () => {
    const { team, user2 } = await createTeamWithMembers({ isPrivate: true });

    //Logged in user is not admin/owner of the team
    const nonAdminUserCtx = {
      user: {
        id: user2.id,
        name: user2.name,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      listMembers({
        ctx: nonAdminUserCtx,
        input: {
          teamId: team.id,
          limit: 10,
        },
      })
    ).rejects.toThrowError("You are not authorized to see members of any teams");
  });

  it("should throw error if user is not part of the private team", async () => {
    const { team } = await createTeamWithMembers({ isPrivate: true });

    const newUser = getOrganizer({
      name: "New User",
      email: "newuser@example.com",
      id: 104,
      schedules: [TestData.schedules.IstWorkHours],
    });

    addUsers([newUser]);

    //Logged in user is not part of the team
    const nonAdminUserCtx = {
      user: {
        id: newUser.id,
        name: newUser.name,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      listMembers({
        ctx: nonAdminUserCtx,
        input: {
          teamId: team.id,
          limit: 10,
        },
      })
    ).rejects.toThrowError("You are not authorized to see members of any teams");
  });

  it("can search by name or email", async () => {
    const { team, organizer } = await createTeamWithMembers({ isPrivate: false });

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    // Search by email
    const searchByEmail = await listMembers({
      ctx,
      input: {
        teamId: team.id,
        limit: 10,
        searchTerm: "organizer",
      },
    });

    expect(searchByEmail.members).toEqual([
      expect.objectContaining({
        id: organizer.id,
        name: organizer.name,
        username: organizer.username,
      }),
    ]);

    // Search by name
    const searchByName = await listMembers({
      ctx,
      input: {
        teamId: team.id,
        limit: 10,
        searchTerm: organizer.name,
      },
    });

    expect(searchByName.members).toEqual([
      expect.objectContaining({
        id: organizer.id,
        name: organizer.name,
        username: organizer.username,
      }),
    ]);
  });
});
