import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { trpc } from "@calcom/trpc";

import type { PermissionString } from "../../types/permission-registry";
import { usePermission, usePermissions } from "../usePermission";

// Mock the trpc hook
vi.mock("@calcom/trpc", () => ({
  trpc: {
    viewer: {
      pbac: {
        checkPermission: {
          useQuery: vi.fn(),
        },
        checkPermissions: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

describe("usePermission", () => {
  const mockTeamId = 1;
  const mockPermission = "team.update" as PermissionString;

  it("should return false and not loading when permission check fails", async () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: false,
      isLoading: false,
    });

    trpc.viewer.pbac.checkPermission.useQuery = mockUseQuery;

    const { result } = renderHook(() => usePermission(mockTeamId, mockPermission));

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      {
        teamId: mockTeamId,
        permission: mockPermission,
      },
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  });

  it("should return true and not loading when permission check succeeds", async () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: true,
      isLoading: false,
    });

    trpc.viewer.pbac.checkPermission.useQuery = mockUseQuery;

    const { result } = renderHook(() => usePermission(mockTeamId, mockPermission));

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should return false and loading state while checking permission", async () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    trpc.viewer.pbac.checkPermission.useQuery = mockUseQuery;

    const { result } = renderHook(() => usePermission(mockTeamId, mockPermission));

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});

describe("usePermissions", () => {
  const mockTeamId = 1;
  const mockPermissions = ["team.update", "team.read"] as PermissionString[];

  it("should return false and not loading when permissions check fails", async () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: false,
      isLoading: false,
    });

    trpc.viewer.pbac.checkPermissions.useQuery = mockUseQuery;

    const { result } = renderHook(() => usePermissions(mockTeamId, mockPermissions));

    await waitFor(() => {
      expect(result.current.hasPermissions).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      {
        teamId: mockTeamId,
        permissions: mockPermissions,
      },
      {
        staleTime: 5 * 60 * 1000,
      }
    );
  });

  it("should return true and not loading when permissions check succeeds", async () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: true,
      isLoading: false,
    });

    trpc.viewer.pbac.checkPermissions.useQuery = mockUseQuery;

    const { result } = renderHook(() => usePermissions(mockTeamId, mockPermissions));

    await waitFor(() => {
      expect(result.current.hasPermissions).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should return false and loading state while checking permissions", async () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    trpc.viewer.pbac.checkPermissions.useQuery = mockUseQuery;

    const { result } = renderHook(() => usePermissions(mockTeamId, mockPermissions));

    expect(result.current.hasPermissions).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
