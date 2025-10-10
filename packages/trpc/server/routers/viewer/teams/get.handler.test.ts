import { describe, it, beforeEach, vi, expect } from "vitest";

import { getTeamWithoutMembers } from "@calcom/features/ee/teams/lib/queries";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { UserRepository } from "@calcom/lib/server/repository/user";

import type { TrpcSessionUser } from "../../../types";
import getTeam from "./get.handler";

type MockedUserRepository = {
  isAdminOfTeamOrParentOrg: ReturnType<typeof vi.fn>;
};

vi.mock("@calcom/lib/server/repository/membership", () => ({
  MembershipRepository: {
    findUniqueByUserIdAndTeamId: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/user", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    isAdminOfTeamOrParentOrg: vi.fn(),
  })),
}));

vi.mock("@calcom/features/ee/teams/lib/queries", () => ({
  getTeamWithoutMembers: vi.fn(),
}));

describe("getTeam", () => {
  const user = {
    id: 1,
    organization: { isOrgAdmin: false },
  } as NonNullable<TrpcSessionUser>;

  const input = {
    teamId: 123,
    isOrg: false,
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("throws UNAUTHORIZED if user is not a member of the team and not an org admin", async () => {
    vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue(null);
    const mockIsAdminOfTeamOrParentOrg = vi.fn().mockResolvedValue(false);
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          isAdminOfTeamOrParentOrg: mockIsAdminOfTeamOrParentOrg,
        } as MockedUserRepository)
    );

    await expect(getTeam({ ctx: { user }, input })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "You are not a member of this team.",
    });

    expect(mockIsAdminOfTeamOrParentOrg).toHaveBeenCalledWith({
      userId: user.id,
      teamId: input.teamId,
    });
  });

  it("throws NOT_FOUND if team does not exist", async () => {
    vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
      role: "member",
      accepted: true,
    });
    vi.mocked(getTeamWithoutMembers).mockResolvedValue(null);

    await expect(getTeam({ ctx: { user }, input })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  });

  it("passes undefined as userId if user is org admin", async () => {
    const adminUser = {
      ...user,
      organization: { isOrgAdmin: true },
    };

    vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
      role: "admin",
      accepted: true,
    });
    vi.mocked(getTeamWithoutMembers).mockResolvedValue({
      id: input.teamId,
      name: "Admin Team",
    });

    await getTeam({ ctx: { user: adminUser }, input });

    expect(getTeamWithoutMembers).toHaveBeenCalledWith({
      id: input.teamId,
      userId: undefined,
      isOrgView: input.isOrg,
    });
  });

  it("returns team data with membership info if authorized", async () => {
    const membershipData = {
      role: "admin",
      accepted: true,
    };
    const teamData = {
      id: input.teamId,
      name: "Team Name",
      description: "A team",
    };

    vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue(membershipData);
    vi.mocked(getTeamWithoutMembers).mockResolvedValue(teamData);

    const result = await getTeam({ ctx: { user }, input });

    expect(result).toEqual({
      ...teamData,
      membership: membershipData,
    });

    expect(MembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
      userId: user.id,
      teamId: input.teamId,
    });

    expect(getTeamWithoutMembers).toHaveBeenCalledWith({
      id: input.teamId,
      userId: user.id,
      isOrgView: input.isOrg,
    });
  });

  it("allows org admin to access subteam without direct membership", async () => {
    vi.mocked(MembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue(null);
    const mockIsAdminOfTeamOrParentOrg = vi.fn().mockResolvedValue(true);
    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          isAdminOfTeamOrParentOrg: mockIsAdminOfTeamOrParentOrg,
        } as MockedUserRepository)
    );

    const teamData = {
      id: input.teamId,
      name: "Subteam",
      description: "A subteam",
    };

    vi.mocked(getTeamWithoutMembers).mockResolvedValue(teamData);

    const result = await getTeam({ ctx: { user }, input });

    expect(result).toEqual({
      ...teamData,
      membership: {
        role: "ADMIN",
        accepted: true,
      },
    });

    expect(mockIsAdminOfTeamOrParentOrg).toHaveBeenCalledWith({
      userId: user.id,
      teamId: input.teamId,
    });
  });
});
