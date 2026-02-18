import { beforeEach, describe, expect, it, vi } from "vitest";

const mockService = {
  shouldCheckEventType: vi.fn().mockResolvedValue(false),
  shouldMonitor: vi.fn().mockResolvedValue(false),
  checkBookingVelocity: vi.fn().mockResolvedValue(false),
};

const mockTasker = {
  analyzeUser: vi.fn().mockResolvedValue({ runId: "run_test123" }),
};

vi.mock("../di/AbuseScoringService.container", () => ({
  getAbuseScoringService: () => mockService,
}));

vi.mock("../di/tasker/AbuseScoringTasker.container", () => ({
  getAbuseScoringTasker: () => mockTasker,
}));

import { onBookingCreated, onEventTypeChange } from "../lib/hooks";

describe("abuse-scoring hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── onEventTypeChange (Gate 2) ──

  describe("onEventTypeChange", () => {
    it("does nothing when shouldCheckEventType returns false", async () => {
      mockService.shouldCheckEventType.mockResolvedValue(false);

      await onEventTypeChange(42);

      expect(mockService.shouldCheckEventType).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser when shouldCheckEventType returns true", async () => {
      mockService.shouldCheckEventType.mockResolvedValue(true);

      await onEventTypeChange(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "event_type_change" },
      });
    });

    it("swallows errors (fail-open)", async () => {
      mockService.shouldCheckEventType.mockRejectedValue(new Error("db down"));

      await expect(onEventTypeChange(42)).resolves.toBeUndefined();
    });
  });

  // ── onBookingCreated (Gate 3) ──

  describe("onBookingCreated", () => {
    it("does nothing when neither flagged nor high velocity", async () => {
      mockService.shouldMonitor.mockResolvedValue(false);
      mockService.checkBookingVelocity.mockResolvedValue(false);

      await onBookingCreated(42);

      expect(mockService.shouldMonitor).toHaveBeenCalledWith(42);
      expect(mockService.checkBookingVelocity).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser for flagged user (path 1)", async () => {
      mockService.shouldMonitor.mockResolvedValue(true);

      await onBookingCreated(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "booking_flagged" },
      });
      // Should not check velocity when already flagged
      expect(mockService.checkBookingVelocity).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser for high velocity unflagged user (path 2)", async () => {
      mockService.shouldMonitor.mockResolvedValue(false);
      mockService.checkBookingVelocity.mockResolvedValue(true);

      await onBookingCreated(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "booking_velocity" },
      });
    });

    it("prefers flagged path over velocity path", async () => {
      mockService.shouldMonitor.mockResolvedValue(true);
      mockService.checkBookingVelocity.mockResolvedValue(true);

      await onBookingCreated(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledTimes(1);
      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "booking_flagged" },
      });
    });

    it("swallows errors (fail-open)", async () => {
      mockService.shouldMonitor.mockRejectedValue(new Error("db down"));

      await expect(onBookingCreated(42)).resolves.toBeUndefined();
    });
  });
});
