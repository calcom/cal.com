/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: Bring this test back with the correct setup (no illegal imports)
import { describe, it, beforeEach, vi, expect } from "vitest";

import type { TrpcSessionUser } from "../../../types";
import getTeam from "./get.handler";

describe.skip("getTeam", () => {
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
