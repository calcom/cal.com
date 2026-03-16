import { beforeEach, describe, expect, it, vi } from "vitest";

const mockService = {
  shouldMonitor: vi.fn().mockResolvedValue(false),
  shouldUsersCheckEventType: vi.fn().mockResolvedValue(false),
  shouldAnalyzeOnBooking: vi.fn().mockResolvedValue(false),
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

import { onSignup, onBookingCreated, onBookingCancelled, onEventTypeChange } from "../lib/hooks";

describe("abuse-scoring hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── onSignup (Gate 1) ──

  describe("onSignup", () => {
    it("does nothing when shouldMonitor returns false", async () => {
      mockService.shouldMonitor.mockResolvedValue(false);

      await onSignup(42);

      expect(mockService.shouldMonitor).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser when shouldMonitor returns true", async () => {
      mockService.shouldMonitor.mockResolvedValue(true);

      await onSignup(42);

      expect(mockService.shouldMonitor).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "signup" },
      });
    });

    it("swallows errors (fail-open)", async () => {
      mockService.shouldMonitor.mockRejectedValue(new Error("db down"));

      await expect(onSignup(42)).resolves.toBeUndefined();
    });
  });

  // ── onEventTypeChange (Gate 2) ──

  describe("onEventTypeChange", () => {
    it("does nothing when shouldUsersCheckEventType returns false", async () => {
      mockService.shouldUsersCheckEventType.mockResolvedValue(false);

      await onEventTypeChange(42);

      expect(mockService.shouldUsersCheckEventType).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser when shouldUsersCheckEventType returns true", async () => {
      mockService.shouldUsersCheckEventType.mockResolvedValue(true);

      await onEventTypeChange(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "event_type_change" },
      });
    });

    it("swallows errors (fail-open)", async () => {
      mockService.shouldUsersCheckEventType.mockRejectedValue(new Error("db down"));

      await expect(onEventTypeChange(42)).resolves.toBeUndefined();
    });
  });

  // ── onBookingCreated (Gate 3) ──

  describe("onBookingCreated", () => {
    it("does nothing when shouldAnalyzeOnBooking returns false", async () => {
      mockService.shouldAnalyzeOnBooking.mockResolvedValue(false);

      await onBookingCreated(42);

      expect(mockService.shouldAnalyzeOnBooking).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser with reason booking_created when shouldAnalyzeOnBooking returns true", async () => {
      mockService.shouldAnalyzeOnBooking.mockResolvedValue(true);

      await onBookingCreated(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "booking_created" },
      });
    });

    it("swallows errors (fail-open)", async () => {
      mockService.shouldAnalyzeOnBooking.mockRejectedValue(new Error("db down"));

      await expect(onBookingCreated(42)).resolves.toBeUndefined();
    });
  });

  // ── onBookingCancelled (Gate 4) ──

  describe("onBookingCancelled", () => {
    it("does nothing when shouldAnalyzeOnBooking returns false", async () => {
      mockService.shouldAnalyzeOnBooking.mockResolvedValue(false);

      await onBookingCancelled(42);

      expect(mockService.shouldAnalyzeOnBooking).toHaveBeenCalledWith(42);
      expect(mockTasker.analyzeUser).not.toHaveBeenCalled();
    });

    it("dispatches analyzeUser with reason booking_cancelled when shouldAnalyzeOnBooking returns true", async () => {
      mockService.shouldAnalyzeOnBooking.mockResolvedValue(true);

      await onBookingCancelled(42);

      expect(mockTasker.analyzeUser).toHaveBeenCalledWith({
        payload: { userId: 42, reason: "booking_cancelled" },
      });
    });

    it("swallows errors (fail-open)", async () => {
      mockService.shouldAnalyzeOnBooking.mockRejectedValue(new Error("db down"));

      await expect(onBookingCancelled(42)).resolves.toBeUndefined();
    });
  });
});
