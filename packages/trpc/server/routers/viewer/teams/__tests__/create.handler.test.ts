import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { MembershipRole, Plans } from "@calcom/prisma/enums";

import { createHandler } from "../create.handler";

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: false,
    WEBAPP_URL: "http://localhost:3000",
  };
});

vi.mock("@calcom/lib/server/repository/profile", () => ({
  ProfileRepository: {
    findByOrgIdAndUsername: vi.fn(),
  },
}));

describe("Team create handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create standalone team with TEAMS plan", async () => {
    prismaMock.team.findFirst.mockResolvedValue(null);

    const mockCreatedTeam = {
      id: 1,
      name: "Test Team",
      slug: "test-team",
      plan: Plans.TEAMS,
      parentId: null,
    };
    prismaMock.team.create.mockResolvedValue(mockCreatedTeam);

    const result = await createHandler({
      ctx: {
        user: {
          id: 123,
          profile: {
            organizationId: null,
          },
        },
      },
      input: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    expect(result.team).toEqual(mockCreatedTeam);
    expect(result.url).toContain("/settings/teams/1/onboard-members");

    expect(prismaMock.team.create).toHaveBeenCalledWith({
      data: {
        slug: "test-team",
        name: "Test Team",
        members: {
          create: {
            userId: 123,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
        plan: Plans.TEAMS,
      },
    });
  });

  it("should create team under organization with ORGANIZATIONS plan", async () => {
    prismaMock.team.findFirst.mockResolvedValue(null);

    const mockCreatedTeam = {
      id: 2,
      name: "Org Team",
      slug: "org-team",
      plan: Plans.ORGANIZATIONS,
      parentId: 456,
    };
    prismaMock.team.create.mockResolvedValue(mockCreatedTeam);

    const result = await createHandler({
      ctx: {
        user: {
          id: 123,
          profile: {
            organizationId: 456,
          },
          organization: {
            isOrgAdmin: true,
          },
        },
      },
      input: {
        name: "Org Team",
        slug: "org-team",
      },
    });

    expect(result.team).toEqual(mockCreatedTeam);
    expect(result.url).toContain("/settings/teams/2/onboard-members");

    expect(prismaMock.team.create).toHaveBeenCalledWith({
      data: {
        slug: "org-team",
        name: "Org Team",
        members: {
          create: {
            userId: 123,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
        parentId: 456,
        plan: Plans.ORGANIZATIONS,
      },
    });
  });

  it("should throw error when slug is already taken", async () => {
    prismaMock.team.findFirst.mockResolvedValue({
      id: 999,
      slug: "taken-slug",
    });

    await expect(
      createHandler({
        ctx: {
          user: {
            id: 123,
            profile: {
              organizationId: null,
            },
          },
        },
        input: {
          name: "Test Team",
          slug: "taken-slug",
        },
      })
    ).rejects.toThrow("team_url_taken");

    expect(prismaMock.team.create).not.toHaveBeenCalled();
  });

  it("should throw error when non-org admin tries to create team in organization", async () => {
    await expect(
      createHandler({
        ctx: {
          user: {
            id: 123,
            profile: {
              organizationId: 456,
            },
            organization: {
              isOrgAdmin: false,
            },
          },
        },
        input: {
          name: "Org Team",
          slug: "org-team",
        },
      })
    ).rejects.toThrow("org_admins_can_create_new_teams");

    expect(prismaMock.team.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.team.create).not.toHaveBeenCalled();
  });

  it("should verify membership creation with OWNER role", async () => {
    prismaMock.team.findFirst.mockResolvedValue(null);

    const mockCreatedTeam = {
      id: 3,
      name: "Test Team",
      slug: "test-team",
      plan: Plans.TEAMS,
      parentId: null,
    };
    prismaMock.team.create.mockResolvedValue(mockCreatedTeam);

    await createHandler({
      ctx: {
        user: {
          id: 789,
          profile: {
            organizationId: null,
          },
        },
      },
      input: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    expect(prismaMock.team.create).toHaveBeenCalledWith({
      data: {
        slug: "test-team",
        name: "Test Team",
        members: {
          create: {
            userId: 789,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
        plan: Plans.TEAMS,
      },
    });
  });
});
