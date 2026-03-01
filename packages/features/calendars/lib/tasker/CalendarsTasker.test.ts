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

import { CalendarsTasker } from "./CalendarsTasker";

describe("CalendarsTasker", () => {
  let tasker: CalendarsTasker;
  const mockEnsureDefaultCalendars = vi.fn();
  const mockAsyncTasker = {
    ensureDefaultCalendars: vi.fn(),
  };
  const mockSyncTasker = {
    ensureDefaultCalendars: mockEnsureDefaultCalendars,
  };
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasker = new CalendarsTasker({
      asyncTasker: mockAsyncTasker as never,
      syncTasker: mockSyncTasker as never,
      logger: mockLogger,
    });
  });

  describe("fn: ensureDefaultCalendars", () => {
    it("should dispatch ensureDefaultCalendars and return runId on success", async () => {
      mockEnsureDefaultCalendars.mockResolvedValue({ runId: "run-123" });

      const result = await tasker.ensureDefaultCalendars({
        payload: { userId: 1 },
      });

      expect(result.runId).toBe("run-123");
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("ensureDefaultCalendars success"),
        expect.anything(),
        expect.objectContaining({ userId: 1 })
      );
    });

    it("should return task-failed runId when dispatch throws", async () => {
      mockEnsureDefaultCalendars.mockRejectedValue(new Error("dispatch failed"));

      const result = await tasker.ensureDefaultCalendars({
        payload: { userId: 1 },
      });

      expect(result.runId).toBe("task-failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("ensureDefaultCalendars failed"),
        expect.anything(),
        expect.objectContaining({ userId: 1 })
      );
    });

    it("should pass payload to the dispatch method", async () => {
      mockEnsureDefaultCalendars.mockResolvedValue({ runId: "run-456" });

      await tasker.ensureDefaultCalendars({
        payload: { userId: 42 },
      });

      expect(mockEnsureDefaultCalendars).toHaveBeenCalledWith({ userId: 42 }, undefined);
    });

    it("should pass options to dispatch when provided", async () => {
      mockEnsureDefaultCalendars.mockResolvedValue({ runId: "run-789" });

      const options = { idempotencyKey: "key-123" };
      await tasker.ensureDefaultCalendars({
        payload: { userId: 1 },
        options: options as never,
      });

      expect(mockEnsureDefaultCalendars).toHaveBeenCalledWith({ userId: 1 }, options);
    });

    it("should not throw even when dispatch fails", async () => {
      mockEnsureDefaultCalendars.mockRejectedValue(new Error("network error"));

      await expect(tasker.ensureDefaultCalendars({ payload: { userId: 1 } })).resolves.toEqual({
        runId: "task-failed",
      });
    });

    it("should log dispatch info before executing", async () => {
      mockEnsureDefaultCalendars.mockResolvedValue({ runId: "run-abc" });

      await tasker.ensureDefaultCalendars({
        payload: { userId: 5 },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Dispatching task"),
        expect.anything()
      );
    });

    it("should use syncTasker when async tasker is disabled", () => {
      // Since ENABLE_ASYNC_TASKER is false, the internal asyncTasker should be the syncTasker
      // We verify by checking that our syncTasker mock gets called
      mockEnsureDefaultCalendars.mockResolvedValue({ runId: "sync-run" });

      const promise = tasker.ensureDefaultCalendars({ payload: { userId: 1 } });

      return promise.then((result) => {
        expect(result.runId).toBe("sync-run");
        expect(mockEnsureDefaultCalendars).toHaveBeenCalled();
      });
    });

    it("should handle multiple sequential calls correctly", async () => {
      mockEnsureDefaultCalendars
        .mockResolvedValueOnce({ runId: "run-1" })
        .mockResolvedValueOnce({ runId: "run-2" });

      const result1 = await tasker.ensureDefaultCalendars({ payload: { userId: 1 } });
      const result2 = await tasker.ensureDefaultCalendars({ payload: { userId: 2 } });

      expect(result1.runId).toBe("run-1");
      expect(result2.runId).toBe("run-2");
    });
  });
});
