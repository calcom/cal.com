import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, it, beforeEach, vi, expect } from "vitest";

import type { TrpcSessionUser } from "../../../trpc";
import lazyLoadMembers from "./lazyLoadMembers.handler";

const createTeamWithMembers = async () => {
  const team = {
    id: 1,
    name: "Team 1",
    slug: "team-1",
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

describe("lazyLoadMembers", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should return team members", async () => {
    const { team, organizer, user2, user3 } = await createTeamWithMembers();

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    const result = await lazyLoadMembers({
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

  it("can search by name or email", async () => {
    const { team, organizer } = await createTeamWithMembers();

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    // Search by email
    const searchByEmail = await lazyLoadMembers({
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
    const searchByName = await lazyLoadMembers({
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
