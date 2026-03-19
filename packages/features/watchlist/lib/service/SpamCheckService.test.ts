import { describe, test, expect, vi, beforeEach } from "vitest";

import { WatchlistType } from "@calcom/prisma/enums";

import type { BlockingResult } from "../interface/IBlockingService";
import type { GlobalBlockingService } from "./GlobalBlockingService";
import type { OrganizationBlockingService } from "./OrganizationBlockingService";
import { SpamCheckService } from "./SpamCheckService";

const mockGlobalBlockingService = {
  isBlocked: vi.fn(),
} as unknown as GlobalBlockingService;

const mockOrgBlockingService = {
  isBlocked: vi.fn(),
} as unknown as OrganizationBlockingService;

describe("SpamCheckService", () => {
  let service: SpamCheckService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpamCheckService(mockGlobalBlockingService, mockOrgBlockingService);
  });

  describe("startCheck and waitForCheck", () => {
    test("should throw if waitForCheck is called before startCheck", async () => {
      await expect(service.waitForCheck()).rejects.toThrow(
        "waitForCheck() called before startCheck(). You must call startCheck() first to initialize spam checking."
      );
    });

    test("should return not blocked when no matches found", async () => {
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });

      service.startCheck({ email: "clean@example.com", organizationId: 1 });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(false);
    });

    test("should return global block result when globally blocked", async () => {
      const globalResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "g1", value: "blocked@example.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue(globalResult);
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });

      service.startCheck({ email: "blocked@example.com", organizationId: 1 });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.EMAIL);
      expect(result.skipCrmOnCancel).toBeUndefined();
    });

    test("should return org block result when org blocked", async () => {
      const orgResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: { id: "o1", value: "competitor.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue(orgResult);

      service.startCheck({ email: "user@competitor.com", organizationId: 1 });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe(WatchlistType.DOMAIN);
    });

    test("should prioritize global block over org block", async () => {
      const globalResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "g1", value: "blocked@example.com" },
      };
      const orgResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: { id: "o1", value: "example.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue(globalResult);
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue(orgResult);

      service.startCheck({ email: "blocked@example.com", organizationId: 1 });
      const result = await service.waitForCheck();

      expect(result).toEqual(globalResult);
    });

    test("should skip org check when organizationId is null", async () => {
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });

      service.startCheck({ email: "user@example.com", organizationId: null });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(false);
      expect(mockOrgBlockingService.isBlocked).not.toHaveBeenCalled();
    });

    test("should return not blocked on error", async () => {
      vi.mocked(mockGlobalBlockingService.isBlocked).mockRejectedValue(new Error("DB error"));

      service.startCheck({ email: "user@example.com", organizationId: null });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(false);
    });
  });

  describe("blocklistSkipCrmOnCancel flag", () => {
    test("should include skipCrmOnCancel=true in result when org blocked and flag is true", async () => {
      const orgResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "o1", value: "blocked@example.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue(orgResult);

      service.startCheck({
        email: "blocked@example.com",
        organizationId: 1,
        blocklistSkipCrmOnCancel: true,
      });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(true);
      expect(result.skipCrmOnCancel).toBe(true);
    });

    test("should include skipCrmOnCancel=false in result when org blocked and flag is false", async () => {
      const orgResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "o1", value: "blocked@example.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue(orgResult);

      service.startCheck({
        email: "blocked@example.com",
        organizationId: 1,
        blocklistSkipCrmOnCancel: false,
      });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(true);
      expect(result.skipCrmOnCancel).toBe(false);
    });

    test("should not include skipCrmOnCancel when org blocked but flag is undefined", async () => {
      const orgResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "o1", value: "blocked@example.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue(orgResult);

      service.startCheck({
        email: "blocked@example.com",
        organizationId: 1,
      });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(true);
      expect(result.skipCrmOnCancel).toBeUndefined();
    });

    test("should not include skipCrmOnCancel when globally blocked even if flag is true", async () => {
      const globalResult: BlockingResult = {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: { id: "g1", value: "blocked@example.com" },
      };
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue(globalResult);
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });

      service.startCheck({
        email: "blocked@example.com",
        organizationId: 1,
        blocklistSkipCrmOnCancel: true,
      });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(true);
      expect(result.skipCrmOnCancel).toBeUndefined();
    });

    test("should not include skipCrmOnCancel when not blocked", async () => {
      vi.mocked(mockGlobalBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });
      vi.mocked(mockOrgBlockingService.isBlocked).mockResolvedValue({ isBlocked: false });

      service.startCheck({
        email: "clean@example.com",
        organizationId: 1,
        blocklistSkipCrmOnCancel: true,
      });
      const result = await service.waitForCheck();

      expect(result.isBlocked).toBe(false);
      expect(result.skipCrmOnCancel).toBeUndefined();
    });
  });
});
