import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import getTeamWithMinimalData from "./getTeamWithMinimalData.handler";

describe("getTeamWithMinimalData", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should return teams", async () => {
    const requiredTeam = await prismaMock.team.findUnique({
      where: {
        id: 2,
      },
    });

    console.log("requiredTeam", requiredTeam);

    const ctx = {
      user: {
        id: 9,
      },
      input: {
        teamId: requiredTeam.id,
      },
    };

    const result = await getTeamWithMinimalData(ctx);

    console.log("result", result);

    expect(result).toContain({
      id: requiredTeam.id,
      name: requiredTeam.name,
      slug: requiredTeam.slug,
    });
  });
});
