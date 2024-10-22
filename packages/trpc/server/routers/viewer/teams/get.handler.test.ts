import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, it, beforeEach, vi, expect } from "vitest";

import type { TrpcSessionUser } from "../../../trpc";
import getTeam from "./get.handler";

describe("getTeam", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should return team", async () => {
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
      })
    );

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    const result = await getTeam({
      ctx,
      input: {
        teamId: team.id,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: team.id,
        name: team.name,
        slug: team.slug,
        isOrganization: false,
      })
    );
  });
});
