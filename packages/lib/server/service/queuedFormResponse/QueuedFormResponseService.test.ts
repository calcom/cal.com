import { describe, it, expect, vi, beforeEach } from "vitest";

import type logger from "@calcom/lib/logger";

import type { QueuedFormResponseRepositoryInterface } from "../../repository/QueuedFormResponseRepository.interface";
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
      findExpiredResponses: vi.fn(),
      deleteByIds: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      findByIdIncludeForm: vi.fn(),
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
      mockRepo.findExpiredResponses
        .mockResolvedValueOnce([{ id: "1" }, { id: "2" }])
        .mockResolvedValueOnce([{ id: "3" }])
        .mockResolvedValueOnce([]);

      mockRepo.deleteByIds.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 1 });

      const resultPromise = service.cleanupExpiredResponses({
        olderThanHours: 2,
        batchSize: 2,
      });

      // Advance timers to handle delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Verify cutoff time calculation
      const expectedCutoffTime = new Date(now - 2 * 60 * 60 * 1000);
      expect(mockRepo.findExpiredResponses).toHaveBeenCalledWith({
        cutoffTime: expectedCutoffTime,
        take: 2,
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
      mockRepo.findExpiredResponses.mockResolvedValueOnce([]);

      const result = await service.cleanupExpiredResponses();

      // Verify default batch size and older than hours
      expect(mockRepo.findExpiredResponses).toHaveBeenCalledWith({
        cutoffTime: expect.any(Date),
        take: 1000, // default batch size
      });

      // Verify the cutoff time is 1 hour ago (default)
      const callArgs = mockRepo.findExpiredResponses.mock.calls[0][0];
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      expect(callArgs.cutoffTime.getTime()).toBeCloseTo(oneHourAgo, -2); // within 100ms

      expect(result).toEqual({
        count: 0,
        batches: 0,
      });
    });

    it("should handle no expired responses", async () => {
      mockRepo.findExpiredResponses.mockResolvedValueOnce([]);

      const result = await service.cleanupExpiredResponses();

      expect(mockRepo.deleteByIds).not.toHaveBeenCalled();
      expect(result).toEqual({
        count: 0,
        batches: 0,
      });
    });

    it("should stop when batch is not full", async () => {
      // Return partial batch
      mockRepo.findExpiredResponses.mockResolvedValueOnce([{ id: "1" }, { id: "2" }, { id: "3" }]);
      mockRepo.deleteByIds.mockResolvedValueOnce({ count: 3 });

      const result = await service.cleanupExpiredResponses({ batchSize: 5 });

      expect(mockRepo.findExpiredResponses).toHaveBeenCalledTimes(1);
      expect(mockRepo.deleteByIds).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        count: 3,
        batches: 1,
      });
    });

    it("should handle errors during batch processing", async () => {
      mockRepo.findExpiredResponses.mockRejectedValueOnce(new Error("Database error"));

      await expect(service.cleanupExpiredResponses()).rejects.toThrow("Database error");
    });
  });

  describe("findById", () => {
    it("should find a queued form response by ID", async () => {
      const mockResponse = {
        id: "123",
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
      };

      mockRepo.findById.mockResolvedValueOnce(mockResponse);

      const result = await service.findById("123");

      expect(mockRepo.findById).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("create", () => {
    it("should create a new queued form response", async () => {
      const createData = {
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: "route1",
      };

      const mockCreatedResponse = {
        id: "new123",
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
      };

      mockRepo.create.mockResolvedValueOnce(mockCreatedResponse);

      const result = await service.create(createData);

      expect(mockRepo.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockCreatedResponse);
    });
  });

  describe("findByIdIncludeForm", () => {
    it("should find a queued form response with form data", async () => {
      const mockResponse = {
        id: "123",
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
        form: {
          routes: [],
          fields: [],
        },
      };

      mockRepo.findByIdIncludeForm.mockResolvedValueOnce(mockResponse);

      const result = await service.findByIdIncludeForm("123");

      expect(mockRepo.findByIdIncludeForm).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockResponse);
    });
  });
});

