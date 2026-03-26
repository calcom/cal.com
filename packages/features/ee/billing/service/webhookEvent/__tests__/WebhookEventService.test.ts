import { WebhookEventStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaWebhookEventRepository } from "../../../repository/webhookEvent/PrismaWebhookEventRepository";
import { WebhookEventService } from "../WebhookEventService";

// Mock the repository
const mockRepository = {
  create: vi.fn(),
  reacquireStale: vi.fn(),
  updateStatus: vi.fn(),
} as unknown as PrismaWebhookEventRepository;

describe("WebhookEventService", () => {
  let service: WebhookEventService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new WebhookEventService({ webhookEventRepository: mockRepository });
  });

  describe("tryAcquire", () => {
    const externalEventId = "test-event-123";

    it("should return created event when repository.create succeeds", async () => {
      const createdEvent = { id: "webhook-123" };
      vi.mocked(mockRepository.create).mockResolvedValue(createdEvent);

      const result = await service.tryAcquire(externalEventId);

      expect(result).toEqual(createdEvent);
      expect(mockRepository.create).toHaveBeenCalledWith(externalEventId);
      expect(mockRepository.reacquireStale).not.toHaveBeenCalled();
    });

    it("should attempt reacquireStale when repository.create returns null", async () => {
      const reacquiredEvent = { id: "webhook-456" };
      vi.mocked(mockRepository.create).mockResolvedValue(null);
      vi.mocked(mockRepository.reacquireStale).mockResolvedValue(reacquiredEvent);

      // Mock Date.now to test stale threshold calculation
      const mockNow = 1640995200000; // Fixed timestamp
      vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const result = await service.tryAcquire(externalEventId);

      expect(result).toEqual(reacquiredEvent);
      expect(mockRepository.create).toHaveBeenCalledWith(externalEventId);

      // Verify reacquireStale is called with correct stale threshold (5 minutes ago)
      const expectedStaleThreshold = new Date(mockNow - 5 * 60 * 1000);
      expect(mockRepository.reacquireStale).toHaveBeenCalledWith(externalEventId, expectedStaleThreshold);
    });

    it("should return null when both create and reacquireStale return null", async () => {
      vi.mocked(mockRepository.create).mockResolvedValue(null);
      vi.mocked(mockRepository.reacquireStale).mockResolvedValue(null);

      const result = await service.tryAcquire(externalEventId);

      expect(result).toBeNull();
      expect(mockRepository.create).toHaveBeenCalledWith(externalEventId);
      expect(mockRepository.reacquireStale).toHaveBeenCalled();
    });

    it("should calculate correct stale threshold (5 minutes ago)", async () => {
      vi.mocked(mockRepository.create).mockResolvedValue(null);
      vi.mocked(mockRepository.reacquireStale).mockResolvedValue(null);

      // Test with specific timestamp
      const mockNow = 1640995200000; // 2022-01-01 00:00:00 UTC
      vi.spyOn(Date, "now").mockReturnValue(mockNow);

      await service.tryAcquire(externalEventId);

      const expectedStaleThreshold = new Date(mockNow - 5 * 60 * 1000); // 5 minutes ago
      expect(mockRepository.reacquireStale).toHaveBeenCalledWith(externalEventId, expectedStaleThreshold);
    });
  });

  describe("markCompleted", () => {
    const eventId = "webhook-789";

    it("should call repository.updateStatus with COMPLETED status", async () => {
      vi.mocked(mockRepository.updateStatus).mockResolvedValue();

      await service.markCompleted(eventId);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(eventId, WebhookEventStatus.COMPLETED);
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Database error");
      vi.mocked(mockRepository.updateStatus).mockRejectedValue(error);

      await expect(service.markCompleted(eventId)).rejects.toThrow("Database error");
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(eventId, WebhookEventStatus.COMPLETED);
    });
  });

  describe("markFailed", () => {
    const eventId = "webhook-999";

    it("should call repository.updateStatus with FAILED status", async () => {
      vi.mocked(mockRepository.updateStatus).mockResolvedValue();

      await service.markFailed(eventId);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(eventId, WebhookEventStatus.FAILED);
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Update failed");
      vi.mocked(mockRepository.updateStatus).mockRejectedValue(error);

      await expect(service.markFailed(eventId)).rejects.toThrow("Update failed");
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(eventId, WebhookEventStatus.FAILED);
    });
  });

  describe("constructor", () => {
    it("should initialize with provided repository dependency", () => {
      const customRepo = {} as PrismaWebhookEventRepository;
      const customService = new WebhookEventService({ webhookEventRepository: customRepo });

      expect(customService).toBeInstanceOf(WebhookEventService);
    });
  });
});
