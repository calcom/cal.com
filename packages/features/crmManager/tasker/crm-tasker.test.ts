import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockConfigure } = vi.hoisted(() => ({
  mockConfigure: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => ({
  ENABLE_ASYNC_TASKER: false,
}));

vi.mock("@trigger.dev/sdk", () => ({
  configure: mockConfigure,
}));

vi.mock("@calcom/lib/redactError", () => ({
  redactError: vi.fn((err: unknown) => err),
}));

import { CRMTasker } from "./crm-tasker";

describe("CRMTasker", () => {
  let tasker: CRMTasker;
  const mockCreateEvent = vi.fn();
  const mockAsyncTasker = {
    createEvent: vi.fn(),
  };
  const mockSyncTasker = {
    createEvent: mockCreateEvent,
  };
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasker = new CRMTasker({
      asyncTasker: mockAsyncTasker as never,
      syncTasker: mockSyncTasker as never,
      logger: mockLogger,
    });
  });

  describe("fn: createEvent", () => {
    it("should dispatch createEvent and return runId on success", async () => {
      mockCreateEvent.mockResolvedValue({ runId: "run-123" });

      const result = await tasker.createEvent({
        payload: { bookingUid: "booking-abc" },
      });

      expect(result.runId).toBe("run-123");
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("createEvent success"),
        expect.anything(),
        expect.objectContaining({ bookingUid: "booking-abc" })
      );
    });

    it("should return task-failed runId when dispatch throws", async () => {
      mockCreateEvent.mockRejectedValue(new Error("dispatch failed"));

      const result = await tasker.createEvent({
        payload: { bookingUid: "booking-abc" },
      });

      expect(result.runId).toBe("task-failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("createEvent failed"),
        expect.anything(),
        expect.objectContaining({ bookingUid: "booking-abc" })
      );
    });

    it("should pass payload to the dispatch method", async () => {
      mockCreateEvent.mockResolvedValue({ runId: "run-456" });

      await tasker.createEvent({
        payload: { bookingUid: "booking-xyz" },
      });

      expect(mockCreateEvent).toHaveBeenCalledWith({ bookingUid: "booking-xyz" });
    });

    it("should not throw even when dispatch fails", async () => {
      mockCreateEvent.mockRejectedValue(new Error("network error"));

      await expect(tasker.createEvent({ payload: { bookingUid: "booking-abc" } })).resolves.toEqual({
        runId: "task-failed",
      });
    });

    it("should log dispatch info before executing", async () => {
      mockCreateEvent.mockResolvedValue({ runId: "run-abc" });

      await tasker.createEvent({
        payload: { bookingUid: "booking-123" },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Dispatching task"),
        expect.anything()
      );
    });

    it("should use syncTasker when async tasker is disabled", () => {
      mockCreateEvent.mockResolvedValue({ runId: "sync-run" });

      const promise = tasker.createEvent({ payload: { bookingUid: "booking-abc" } });

      return promise.then((result) => {
        expect(result.runId).toBe("sync-run");
        expect(mockCreateEvent).toHaveBeenCalled();
      });
    });

    it("should handle multiple sequential calls correctly", async () => {
      mockCreateEvent.mockResolvedValueOnce({ runId: "run-1" }).mockResolvedValueOnce({ runId: "run-2" });

      const result1 = await tasker.createEvent({ payload: { bookingUid: "booking-1" } });
      const result2 = await tasker.createEvent({ payload: { bookingUid: "booking-2" } });

      expect(result1.runId).toBe("run-1");
      expect(result2.runId).toBe("run-2");
    });
  });
});
