/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { WatchlistType, WatchlistAction, MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { createWatchlistEntryHandler } from "./createWatchlistEntry.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/lib/server/repository/watchlist.repository");

describe("createWatchlistEntryHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockWatchlistRepo = {
    createEntry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);
    vi.mocked(WatchlistRepository).mockImplementation(() => mockWatchlistRepo as any);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        createWatchlistEntryHandler({
          ctx: { user: { ...(mockUser as any), organizationId: undefined, profile: null } },
          input: {
            type: WatchlistType.EMAIL,
            value: "spam@example.com",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to manage blocklist",
      });

      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as any },
          input: {
            type: WatchlistType.EMAIL,
            value: "spam@example.com",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to create blocklist entries",
      });

      expect(mockWatchlistRepo.createEntry).not.toHaveBeenCalled();
    });

    it("should check permission with correct parameters", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-1" });

      await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.EMAIL,
          value: "test@example.com",
        },
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        permission: "watchlist.create",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should throw BAD_REQUEST for invalid email format", async () => {
      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as any },
          input: {
            type: WatchlistType.EMAIL,
            value: "invalid-email",
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid email address format",
      });

      expect(mockWatchlistRepo.createEntry).not.toHaveBeenCalled();
    });

    it("should throw BAD_REQUEST for email missing @ symbol", async () => {
      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as any },
          input: {
            type: WatchlistType.EMAIL,
            value: "notanemail.com",
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid email address format",
      });
    });

    it("should accept valid domain format without @", async () => {
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-1" });

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.DOMAIN,
          value: "example.com",
        },
      });

      expect(result.success).toBe(true);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalled();
    });

    it("should throw BAD_REQUEST for domain with invalid format", async () => {
      await expect(
        createWatchlistEntryHandler({
          ctx: { user: mockUser as any },
          input: {
            type: WatchlistType.DOMAIN,
            value: "invalid..domain",
          },
        })
      ).rejects.toStrictEqual(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain format (e.g., example.com)",
        })
      );
    });

    it("should accept valid email format", async () => {
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-1" });

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.EMAIL,
          value: "valid@example.com",
        },
      });

      expect(result.success).toBe(true);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalled();
    });

    it("should accept valid domain format and normalize it", async () => {
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-1" });

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.DOMAIN,
          value: "example.com",
        },
      });

      expect(result.success).toBe(true);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          value: "example.com",
        })
      );
    });
  });

  describe("successful creation", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should create watchlist entry for EMAIL type", async () => {
      const mockEntry = {
        id: "watchlist-1",
        type: WatchlistType.EMAIL,
        value: "spam@example.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
      };
      mockWatchlistRepo.createEntry.mockResolvedValue(mockEntry);

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.EMAIL,
          value: "spam@example.com",
        },
      });

      expect(result.success).toBe(true);
      expect(result.entry).toEqual(mockEntry);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spam@example.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
        description: undefined,
        userId: 1,
      });
    });

    it("should create watchlist entry for DOMAIN type and normalize it", async () => {
      const mockEntry = {
        id: "watchlist-2",
        type: WatchlistType.DOMAIN,
        value: "spammer.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
      };
      mockWatchlistRepo.createEntry.mockResolvedValue(mockEntry);

      const result = await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.DOMAIN,
          value: "spammer.com",
        },
      });

      expect(result.success).toBe(true);
      expect(result.entry).toEqual(mockEntry);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.DOMAIN,
        value: "spammer.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
        description: undefined,
        userId: 1,
      });
    });

    it("should convert value to lowercase", async () => {
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-4" });

      await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.EMAIL,
          value: "SPAM@EXAMPLE.COM",
        },
      });

      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spam@example.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
        description: undefined,
        userId: 1,
      });
    });

    it("should always set action to BLOCK", async () => {
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-5" });

      await createWatchlistEntryHandler({
        ctx: { user: mockUser as any },
        input: {
          type: WatchlistType.EMAIL,
          value: "test@example.com",
        },
      });

      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: WatchlistAction.BLOCK,
        })
      );
    });
  });
});
