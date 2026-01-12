import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type logger from "@calcom/lib/logger";

import type { QueuedFormResponseRepositoryInterface } from "./QueuedFormResponseRepository.interface";
import { QueuedFormResponseService } from "./QueuedFormResponseService";

describe("QueuedFormResponseService", () => {
  let service: QueuedFormResponseService;
  let mockRepo: jest.Mocked<QueuedFormResponseRepositoryInterface>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  function createMockLogger() {
    const subLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    return {
      getSubLogger: vi.fn().mockReturnValue(subLogger),
      subLogger,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockRepo = {
      findMany: vi.fn(),
      deleteByIds: vi.fn(),
    } as unknown as jest.Mocked<QueuedFormResponseRepositoryInterface>;

    mockLogger = createMockLogger();

    service = new QueuedFormResponseService({
      logger: mockLogger as unknown as typeof logger,
      queuedFormResponseRepo: mockRepo,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("cleanupExpiredResponses", () => {
    it("should clean up expired responses in batches", async () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      // Mock first batch
      mockRepo.findMany
        .mockResolvedValueOnce([{ id: "1" }, { id: "2" }] as any)
        .mockResolvedValueOnce([{ id: "3" }] as any)
        .mockResolvedValueOnce([]);

      mockRepo.deleteByIds.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 1 });

      const resultPromise = service.cleanupExpiredResponses({
        batchSize: 2,
      });

      // Advance timers to handle delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Verify cutoff time calculation (7 days is hardcoded)
      const expectedCutoffTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findMany).toHaveBeenCalledWith({
        where: {
          actualResponseId: null,
          createdAt: {
            lt: expectedCutoffTime,
          },
        },
        params: {
          take: 2,
        },
      });

      // Verify deletion calls
      expect(mockRepo.deleteByIds).toHaveBeenCalledWith(["1", "2"]);
      expect(mockRepo.deleteByIds).toHaveBeenCalledWith(["3"]);

      // Verify result
      expect(result).toEqual({
        count: 3,
        batches: 2,
      });
    });

    it("should use default values when config is not provided", async () => {
      mockRepo.findMany.mockResolvedValueOnce([]);

      const result = await service.cleanupExpiredResponses();
      const expectedCutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Verify default batch size and older than days
      expect(mockRepo.findMany).toHaveBeenCalledWith({
        where: {
          actualResponseId: null,
          createdAt: {
            lt: expectedCutoffTime,
          },
        },
        params: {
          take: 1000, // default batch size
        },
      });

      expect(result).toEqual({
        count: 0,
        batches: 0,
      });
    });

    it("should handle no expired responses", async () => {
      mockRepo.findMany.mockResolvedValueOnce([]);

      const result = await service.cleanupExpiredResponses();

      expect(mockRepo.deleteByIds).not.toHaveBeenCalled();
      expect(result).toEqual({
        count: 0,
        batches: 0,
      });
    });

    it("should stop when batch is not full", async () => {
      // Return partial batch
      mockRepo.findMany.mockResolvedValueOnce([{ id: "1" }, { id: "2" }, { id: "3" }] as any);
      mockRepo.deleteByIds.mockResolvedValueOnce({ count: 3 });

      const result = await service.cleanupExpiredResponses({ batchSize: 5 });

      expect(mockRepo.findMany).toHaveBeenCalledTimes(1);
      expect(mockRepo.deleteByIds).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        count: 3,
        batches: 1,
      });
    });

    it("should handle errors during batch processing", async () => {
      mockRepo.findMany.mockRejectedValueOnce(new Error("Database error"));

      await expect(service.cleanupExpiredResponses()).rejects.toThrow("Database error");
    });
  });
});
