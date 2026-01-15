import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcSessionUser } from "../../../types";

const { mockFindTeamsNotBelongingToOrgByIds, mockCheckPermission, mockAddMembersToTeams } = vi.hoisted(
  () => ({
    mockFindTeamsNotBelongingToOrgByIds: vi.fn(),
    mockCheckPermission: vi.fn(),
    mockAddMembersToTeams: vi.fn(),
  })
);

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

vi.mock("@calcom/features/ee/teams/services/teamService", () => ({
  TeamService: {
    addMembersToTeams: mockAddMembersToTeams,
  },
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
    mockAddMembersToTeams.mockResolvedValue(undefined);

    prisma.membership.findMany.mockResolvedValue([]);
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

  it("should call TeamService.addMembersToTeams with correct membership data", async () => {
    const user = createMockUser();
    const userIds = [10, 20];
    const teamIds = [1, 2];

    prisma.membership.findMany
      .mockResolvedValueOnce([
        { userId: 10, teamId: ORGANIZATION_ID, accepted: true },
        { userId: 20, teamId: ORGANIZATION_ID, accepted: true },
      ])
      .mockResolvedValueOnce([]);

    const result = await addMembersToTeams({
      user,
      input: { userIds, teamIds },
    });

    expect(result.success).toBe(true);
    expect(result.invitedTotalUsers).toBe(2);

    expect(mockAddMembersToTeams).toHaveBeenCalledTimes(1);
    expect(mockAddMembersToTeams).toHaveBeenCalledWith({
      membershipData: expect.arrayContaining([
        expect.objectContaining({ userId: 10, teamId: 1, role: MembershipRole.MEMBER, accepted: true }),
        expect.objectContaining({ userId: 10, teamId: 2, role: MembershipRole.MEMBER, accepted: true }),
        expect.objectContaining({ userId: 20, teamId: 1, role: MembershipRole.MEMBER, accepted: true }),
        expect.objectContaining({ userId: 20, teamId: 2, role: MembershipRole.MEMBER, accepted: true }),
      ]),
    });
  });

  it("should pass correct accepted status based on org membership", async () => {
    const user = createMockUser();
    const userIds = [10, 20];
    const teamIds = [1];

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
    expect(mockAddMembersToTeams).toHaveBeenCalledWith({
      membershipData: expect.arrayContaining([
        expect.objectContaining({ userId: 10, teamId: 1, accepted: true }),
        expect.objectContaining({ userId: 20, teamId: 1, accepted: false }),
      ]),
    });
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
    expect(mockAddMembersToTeams).toHaveBeenCalledWith({
      membershipData: [expect.objectContaining({ userId: 20, teamId: 1 })],
    });
  });

  it("should not call TeamService when no users to add", async () => {
    const user = createMockUser();
    const userIds = [10];
    const teamIds = [1];

    prisma.membership.findMany
      .mockResolvedValueOnce([{ userId: 10, teamId: ORGANIZATION_ID, accepted: true }])
      .mockResolvedValueOnce([{ userId: 10, teamId: 1 }]);

    const result = await addMembersToTeams({
      user,
      input: { userIds, teamIds },
    });

    expect(result.success).toBe(true);
    expect(mockAddMembersToTeams).toHaveBeenCalledWith({
      membershipData: [],
    });
  });
});
