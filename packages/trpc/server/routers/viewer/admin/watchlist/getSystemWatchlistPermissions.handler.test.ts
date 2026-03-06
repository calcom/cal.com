import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";

import { getSystemWatchlistPermissionsHandler } from "./getSystemWatchlistPermissions.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");

describe("getSystemWatchlistPermissionsHandler", () => {
  const mockCheckPermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(function (this: unknown) {
      return { checkPermission: mockCheckPermission } as unknown as InstanceType<
        typeof PermissionCheckService
      >;
    });
  });

  it("returns all permissions true when user has no organization", async () => {
    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: null } as never },
    });

    expect(result).toEqual({
      canRead: true,
      canCreate: true,
      canDelete: true,
      canUpdate: true,
    });
    expect(mockCheckPermission).not.toHaveBeenCalled();
  });

  it("calls checkPermission for each watchlist permission when user has organization", async () => {
    mockCheckPermission
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: 100 } as never },
    });

    expect(result).toEqual({
      canRead: true,
      canCreate: false,
      canDelete: true,
      canUpdate: false,
    });
    expect(mockCheckPermission).toHaveBeenCalledTimes(4);
    expect(mockCheckPermission).toHaveBeenNthCalledWith(1, {
      userId: 1,
      teamId: 100,
      permission: "watchlist.read",
      fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
    });
    expect(mockCheckPermission).toHaveBeenNthCalledWith(2, {
      userId: 1,
      teamId: 100,
      permission: "watchlist.create",
      fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
    });
    expect(mockCheckPermission).toHaveBeenNthCalledWith(3, {
      userId: 1,
      teamId: 100,
      permission: "watchlist.delete",
      fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
    });
    expect(mockCheckPermission).toHaveBeenNthCalledWith(4, {
      userId: 1,
      teamId: 100,
      permission: "watchlist.update",
      fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
    });
  });

  it("returns all permissions false when user is denied every permission", async () => {
    mockCheckPermission.mockResolvedValue(false);

    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: 100 } as never },
    });

    expect(result).toEqual({
      canRead: false,
      canCreate: false,
      canDelete: false,
      canUpdate: false,
    });
    expect(mockCheckPermission).toHaveBeenCalledTimes(4);
  });

  it("returns read-only permissions when only watchlist.read is granted", async () => {
    mockCheckPermission.mockImplementation(async ({ permission }) => {
      return permission === "watchlist.read";
    });

    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: 100 } as never },
    });

    expect(result).toEqual({
      canRead: true,
      canCreate: false,
      canDelete: false,
      canUpdate: false,
    });
  });

  it("returns all permissions true when user has no organization (organizationId = undefined)", async () => {
    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: undefined } as never },
    });

    expect(result).toEqual({
      canRead: true,
      canCreate: true,
      canDelete: true,
      canUpdate: true,
    });
    expect(mockCheckPermission).not.toHaveBeenCalled();
  });

  it("returns all permissions true when user has no organization (organizationId = 0)", async () => {
    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: 0 } as never },
    });

    expect(result).toEqual({
      canRead: true,
      canCreate: true,
      canDelete: true,
      canUpdate: true,
    });
    expect(mockCheckPermission).not.toHaveBeenCalled();
  });

  it("propagates errors from PermissionCheckService", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Service unavailable"));

    await expect(
      getSystemWatchlistPermissionsHandler({
        ctx: { user: { id: 1, organizationId: 100 } as never },
      })
    ).rejects.toThrow("Service unavailable");
  });

  it("returns create+delete but no read+update (write-only scenario)", async () => {
    mockCheckPermission.mockImplementation(async ({ permission }) => {
      return permission === "watchlist.create" || permission === "watchlist.delete";
    });

    const result = await getSystemWatchlistPermissionsHandler({
      ctx: { user: { id: 1, organizationId: 100 } as never },
    });

    expect(result).toEqual({
      canRead: false,
      canCreate: true,
      canDelete: true,
      canUpdate: false,
    });
  });
});
