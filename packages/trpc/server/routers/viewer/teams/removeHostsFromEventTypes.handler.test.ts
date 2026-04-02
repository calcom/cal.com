/* eslint-disable @typescript-eslint/no-explicit-any */

import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../types";
import removeHostsFromEventTypesHandler from "./removeHostsFromEventTypes.handler";

vi.mock("@calcom/prisma", () => ({
  default: {
    host: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn(),
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    findAcceptedMembershipsByUserIdsInTeam: vi.fn(),
  },
}));

describe("removeHostsFromEventTypesHandler", () => {
  const mockUser = {
    id: 1,
    name: "Test User",
  } as NonNullable<TrpcSessionUser>;

  const mockInput = {
    userIds: [101, 102],
    eventTypeIds: [201, 202],
    teamId: 300,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UNAUTHORIZED if user does not have eventType.update permission", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(false);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    await expect(
      removeHostsFromEventTypesHandler({
        ctx: { user: mockUser },
        input: mockInput,
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect(mockCheckPermission).toHaveBeenCalledWith({
      userId: mockUser.id,
      teamId: mockInput.teamId,
      permission: "eventType.update",
      fallbackRoles: ["OWNER", "ADMIN"],
    });

    expect(MembershipRepository.findAcceptedMembershipsByUserIdsInTeam).not.toHaveBeenCalled();
    expect(prisma.host.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes hosts when user has permission and all users are team members", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // Mock that all userIds are valid team members
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([
      { userId: 101 },
      { userId: 102 },
    ]);

    const mockDeleteResult = { count: 3 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: mockInput,
    });

    expect(result).toEqual(mockDeleteResult);

    expect(mockCheckPermission).toHaveBeenCalledWith({
      userId: mockUser.id,
      teamId: mockInput.teamId,
      permission: "eventType.update",
      fallbackRoles: ["OWNER", "ADMIN"],
    });

    expect(MembershipRepository.findAcceptedMembershipsByUserIdsInTeam).toHaveBeenCalledWith({
      userIds: mockInput.userIds,
      teamId: mockInput.teamId,
    });

    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: {
          in: mockInput.eventTypeIds,
        },
        eventType: {
          teamId: mockInput.teamId,
        },
        userId: {
          in: mockInput.userIds,
        },
      },
    });
  });

  it("only removes hosts for userIds that are team members (filters out non-members)", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // Mock that only userId 101 is a team member, 102 is not
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([{ userId: 101 }]);

    const mockDeleteResult = { count: 1 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: mockInput,
    });

    expect(result).toEqual(mockDeleteResult);

    expect(MembershipRepository.findAcceptedMembershipsByUserIdsInTeam).toHaveBeenCalledWith({
      userIds: mockInput.userIds,
      teamId: mockInput.teamId,
    });

    // Should only delete for userId 101, not 102
    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: {
          in: mockInput.eventTypeIds,
        },
        eventType: {
          teamId: mockInput.teamId,
        },
        userId: {
          in: [101], // Only 101, not 102
        },
      },
    });
  });

  it("handles empty userIds array", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // Empty array means no memberships to validate
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([]);

    const mockDeleteResult = { count: 0 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const emptyUsersInput = {
      ...mockInput,
      userIds: [],
    };

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: emptyUsersInput,
    });

    expect(result).toEqual(mockDeleteResult);

    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: {
          in: mockInput.eventTypeIds,
        },
        eventType: {
          teamId: mockInput.teamId,
        },
        userId: {
          in: [],
        },
      },
    });
  });

  it("handles empty eventTypeIds array", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // Mock that all userIds are valid team members
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([
      { userId: 101 },
      { userId: 102 },
    ]);

    const mockDeleteResult = { count: 0 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const emptyEventTypesInput = {
      ...mockInput,
      eventTypeIds: [],
    };

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: emptyEventTypesInput,
    });

    expect(result).toEqual(mockDeleteResult);

    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: {
          in: [],
        },
        eventType: {
          teamId: mockInput.teamId,
        },
        userId: {
          in: mockInput.userIds,
        },
      },
    });
  });

  it("returns count of 0 when no hosts match the criteria", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // Mock that all userIds are valid team members
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([
      { userId: 101 },
      { userId: 102 },
    ]);

    const mockDeleteResult = { count: 0 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: mockInput,
    });

    expect(result.count).toBe(0);
  });

  it("returns count of 0 when userId is a team member but not a host on the specified event types", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // User 999 is a valid team member
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([{ userId: 999 }]);

    // But they're not a host on any of the event types
    const mockDeleteResult = { count: 0 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const nonHostInput = {
      ...mockInput,
      userIds: [999],
    };

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: nonHostInput,
    });

    expect(result.count).toBe(0);

    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: {
          in: mockInput.eventTypeIds,
        },
        eventType: {
          teamId: mockInput.teamId,
        },
        userId: {
          in: [999],
        },
      },
    });
  });

  it("returns count of 0 when event types do not belong to the specified team", async () => {
    const mockCheckPermission = vi.fn().mockResolvedValue(true);
    (PermissionCheckService as any).mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
      };
    });

    // Mock that all userIds are valid team members
    (MembershipRepository.findAcceptedMembershipsByUserIdsInTeam as any).mockResolvedValue([
      { userId: 101 },
      { userId: 102 },
    ]);

    // Event types belong to a different team, so no hosts should be deleted
    const mockDeleteResult = { count: 0 };
    (prisma.host.deleteMany as any).mockResolvedValue(mockDeleteResult);

    const result = await removeHostsFromEventTypesHandler({
      ctx: { user: mockUser },
      input: mockInput,
    });

    expect(result.count).toBe(0);

    // Verify the query includes the teamId check
    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: {
          in: mockInput.eventTypeIds,
        },
        eventType: {
          teamId: mockInput.teamId,
        },
        userId: {
          in: mockInput.userIds,
        },
      },
    });
  });
});
