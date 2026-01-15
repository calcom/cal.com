import { describe, it, beforeEach, vi, expect } from "vitest";

import { getTeamWithoutMembers } from "@calcom/features/ee/teams/lib/queries";

import type { TrpcSessionUser } from "../../../types";
import getTeam from "./get.handler";

const { mockFindUniqueByUserIdAndTeamId, MockMembershipRepository } = vi.hoisted(() => {
  const mockFindUniqueByUserIdAndTeamId = vi.fn();

  class MockMembershipRepository {
    findUniqueByUserIdAndTeamId = mockFindUniqueByUserIdAndTeamId;
  }

  return { mockFindUniqueByUserIdAndTeamId, MockMembershipRepository };
});

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: MockMembershipRepository,
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

  it("throws UNAUTHORIZED if user is not a member of the team", async () => {
    mockFindUniqueByUserIdAndTeamId.mockResolvedValue(null);

    await expect(getTeam({ ctx: { user }, input })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "You are not a member of this team.",
    });
  });

  it("throws NOT_FOUND if team does not exist", async () => {
    mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
      role: "member",
      accepted: true,
    });
    (getTeamWithoutMembers as any).mockResolvedValue(null);

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

    mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
      role: "admin",
      accepted: true,
    });
    (getTeamWithoutMembers as any).mockResolvedValue({
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

    mockFindUniqueByUserIdAndTeamId.mockResolvedValue(membershipData);
    (getTeamWithoutMembers as any).mockResolvedValue(teamData);

    const result = await getTeam({ ctx: { user }, input });

    expect(result).toEqual({
      ...teamData,
      membership: membershipData,
    });

    expect(mockFindUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
      userId: user.id,
      teamId: input.teamId,
    });

    expect(getTeamWithoutMembers).toHaveBeenCalledWith({
      id: input.teamId,
      userId: user.id,
      isOrgView: input.isOrg,
    });
  });
});
