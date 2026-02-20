import { beforeEach, describe, expect, it, vi } from "vitest";

const mockService = {
  checkSignup: vi.fn().mockResolvedValue({ flagged: false, flags: [], initialScore: 0 }),
  shouldUsersCheckEventType: vi.fn().mockResolvedValue(false),
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

import { onSignup, onBookingCreated, onEventTypeChange } from "../lib/hooks";

describe("abuse-scoring hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── onSignup (Gate 1) ──

  describe("onSignup", () => {
    it("returns unflagged result when checkSignup finds no matches", async () => {
      mockService.checkSignup.mockResolvedValue({ flagged: false, flags: [], initialScore: 0 });

      const result = await onSignup("clean@example.com");

      expect(mockService.checkSignup).toHaveBeenCalledWith("clean@example.com", undefined);
      expect(result).toEqual({ flagged: false, flags: [], initialScore: 0 });
    });

    it("passes username to checkSignup for spam keyword matching", async () => {
      mockService.checkSignup.mockResolvedValue({ flagged: false, flags: [], initialScore: 0 });

      await onSignup("user@example.com", "bitcointrader");

      expect(mockService.checkSignup).toHaveBeenCalledWith("user@example.com", "bitcointrader");
    });

    it("returns flagged result when checkSignup finds matches", async () => {
      const flaggedResult = {
        flagged: true,
        flags: [{ type: "suspicious_domain", domain: "tempmail.org", at: "2026-02-10T00:00:00Z" }],
        initialScore: 10,
      };
      mockService.checkSignup.mockResolvedValue(flaggedResult);

      const result = await onSignup("bad@tempmail.org");

      expect(mockService.checkSignup).toHaveBeenCalledWith("bad@tempmail.org", undefined);
      expect(result).toEqual(flaggedResult);
    });

    it("returns unflagged on error (fail-open)", async () => {
      mockService.checkSignup.mockRejectedValue(new Error("db down"));

      const result = await onSignup("any@example.com");

      expect(result).toEqual({ flagged: false, flags: [], initialScore: 0 });
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
