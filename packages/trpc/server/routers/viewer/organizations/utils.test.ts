import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcSessionUser } from "../../../types";

const { mockFindTeamsNotBelongingToOrgByIds, mockCheckPermission, mockUpdateNewTeamMemberEventTypes } =
  vi.hoisted(() => ({
    mockFindTeamsNotBelongingToOrgByIds: vi.fn(),
    mockCheckPermission: vi.fn(),
    mockUpdateNewTeamMemberEventTypes: vi.fn(),
  }));

vi.mock("@calcom/prisma", () => ({
  prisma,
  default: prisma,
}));

vi.mock("@calcom/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(function () {
    return {
      findTeamsNotBelongingToOrgByIds: mockFindTeamsNotBelongingToOrgByIds,
    };
  }),
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(function () {
    return {
      checkPermission: mockCheckPermission,
    };
  }),
}));

vi.mock("@calcom/features/ee/teams/lib/queries", () => ({
  updateNewTeamMemberEventTypes: mockUpdateNewTeamMemberEventTypes,
}));

import { addMembersToTeams } from "./utils";

const ORGANIZATION_ID = 100;

const createMockUser = (overrides = {}): NonNullable<TrpcSessionUser> =>
  ({
    id: 1,
    organizationId: ORGANIZATION_ID,
    ...overrides,
  }) as NonNullable<TrpcSessionUser>;

describe("addMembersToTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindTeamsNotBelongingToOrgByIds.mockResolvedValue([]);
    mockCheckPermission.mockResolvedValue(true);
    mockUpdateNewTeamMemberEventTypes.mockResolvedValue(undefined);

    prisma.team.findMany.mockResolvedValue([]);
    prisma.membership.findMany.mockResolvedValue([]);
    prisma.membership.createMany.mockResolvedValue({ count: 0 });
  });

  it("should throw UNAUTHORIZED if user has no organizationId", async () => {
    const user = createMockUser({ organizationId: null });

    await expect(
      addMembersToTeams({
        user,
        input: { userIds: [1], teamIds: [1] },
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("should throw BAD_REQUEST if teams do not belong to organization", async () => {
    const user = createMockUser();
    mockFindTeamsNotBelongingToOrgByIds.mockResolvedValue([{ id: 999 }]);

    await expect(
      addMembersToTeams({
        user,
        input: { userIds: [1], teamIds: [999] },
      })
    ).rejects.toThrow("One or more teams do not belong to your organization");
  });

  it("should throw UNAUTHORIZED if user lacks permission", async () => {
    const user = createMockUser();
    mockCheckPermission.mockResolvedValue(false);

    await expect(
      addMembersToTeams({
        user,
        input: { userIds: [1], teamIds: [1] },
      })
    ).rejects.toThrow("You are not authorized to add members to teams in this organization");
  });

  it("should throw BAD_REQUEST if users are not in the organization", async () => {
    const user = createMockUser();

    prisma.membership.findMany.mockResolvedValueOnce([]);

    await expect(
      addMembersToTeams({
        user,
        input: { userIds: [1, 2], teamIds: [1] },
      })
    ).rejects.toThrow("One or more users are not in the organization");
  });

  it("should wait for all updateNewTeamMemberEventTypes calls to complete before returning", async () => {
    const user = createMockUser();
    const userIds = [10, 20];
    const teamIds = [1, 2];

    const callCompletionOrder: string[] = [];

    prisma.membership.findMany
      .mockResolvedValueOnce([
        { userId: 10, teamId: ORGANIZATION_ID, accepted: true },
        { userId: 20, teamId: ORGANIZATION_ID, accepted: true },
      ])
      .mockResolvedValueOnce([]);

    mockUpdateNewTeamMemberEventTypes.mockImplementation(async (userId: number, teamId: number) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      callCompletionOrder.push(`${userId}-${teamId}`);
    });

    const result = await addMembersToTeams({
      user,
      input: { userIds, teamIds },
    });

    expect(result.success).toBe(true);
    expect(result.invitedTotalUsers).toBe(2);

    expect(callCompletionOrder).toHaveLength(4);
    expect(callCompletionOrder).toContain("10-1");
    expect(callCompletionOrder).toContain("10-2");
    expect(callCompletionOrder).toContain("20-1");
    expect(callCompletionOrder).toContain("20-2");

    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledTimes(4);
  });

  it("should call updateNewTeamMemberEventTypes for each user-team combination", async () => {
    const user = createMockUser();
    const userIds = [10, 20];
    const teamIds = [1, 2];

    prisma.membership.findMany
      .mockResolvedValueOnce([
        { userId: 10, teamId: ORGANIZATION_ID, accepted: true },
        { userId: 20, teamId: ORGANIZATION_ID, accepted: false },
      ])
      .mockResolvedValueOnce([]);

    const result = await addMembersToTeams({
      user,
      input: { userIds, teamIds },
    });

    expect(result.success).toBe(true);
    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledWith(10, 1);
    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledWith(10, 2);
    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledWith(20, 1);
    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledWith(20, 2);
  });

  it("should skip users already in teams", async () => {
    const user = createMockUser();
    const userIds = [10, 20];
    const teamIds = [1];

    prisma.membership.findMany
      .mockResolvedValueOnce([
        { userId: 10, teamId: ORGANIZATION_ID, accepted: true },
        { userId: 20, teamId: ORGANIZATION_ID, accepted: true },
      ])
      .mockResolvedValueOnce([{ userId: 10, teamId: 1 }]);

    const result = await addMembersToTeams({
      user,
      input: { userIds, teamIds },
    });

    expect(result.success).toBe(true);
    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledTimes(1);
    expect(mockUpdateNewTeamMemberEventTypes).toHaveBeenCalledWith(20, 1);
  });

  it("should create memberships with correct data", async () => {
    const user = createMockUser();
    const userIds = [10];
    const teamIds = [1];

    prisma.membership.findMany
      .mockResolvedValueOnce([{ userId: 10, teamId: ORGANIZATION_ID, accepted: true }])
      .mockResolvedValueOnce([]);

    await addMembersToTeams({
      user,
      input: { userIds, teamIds },
    });

    expect(prisma.membership.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 10,
          teamId: 1,
          role: MembershipRole.MEMBER,
          accepted: true,
        }),
      ],
    });
  });
});
