import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("abc1234567"),
}));

import { CalendarsSyncTasker } from "./CalendarsSyncTasker";

describe("CalendarsSyncTasker", () => {
  let syncTasker: CalendarsSyncTasker;
  const mockCalendarsTaskService = {
    ensureDefaultCalendars: vi.fn(),
  };
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    syncTasker = new CalendarsSyncTasker({
      calendarsTaskService: mockCalendarsTaskService as never,
      logger: mockLogger,
    });
  });

  describe("fn: ensureDefaultCalendars", () => {
    it("should call calendarsTaskService.ensureDefaultCalendars with the payload", async () => {
      mockCalendarsTaskService.ensureDefaultCalendars.mockResolvedValue(undefined);

      await syncTasker.ensureDefaultCalendars({ userId: 1 });

      expect(mockCalendarsTaskService.ensureDefaultCalendars).toHaveBeenCalledWith({ userId: 1 });
    });

    it("should return a runId with sync_ prefix and nanoid", async () => {
      mockCalendarsTaskService.ensureDefaultCalendars.mockResolvedValue(undefined);

      const result = await syncTasker.ensureDefaultCalendars({ userId: 1 });

      expect(result.runId).toBe("sync_abc1234567");
    });

    it("should await the task service before returning", async () => {
      let resolved = false;
      mockCalendarsTaskService.ensureDefaultCalendars.mockImplementation(async () => {
        resolved = true;
      });

      const result = await syncTasker.ensureDefaultCalendars({ userId: 42 });

      expect(resolved).toBe(true);
      expect(result.runId).toMatch(/^sync_/);
    });

    it("should propagate errors from the task service", async () => {
      mockCalendarsTaskService.ensureDefaultCalendars.mockRejectedValue(new Error("Service failed"));

      await expect(syncTasker.ensureDefaultCalendars({ userId: 1 })).rejects.toThrow("Service failed");
    });

    it("should pass different userId payloads correctly", async () => {
      mockCalendarsTaskService.ensureDefaultCalendars.mockResolvedValue(undefined);

      await syncTasker.ensureDefaultCalendars({ userId: 100 });
      await syncTasker.ensureDefaultCalendars({ userId: 200 });

      expect(mockCalendarsTaskService.ensureDefaultCalendars).toHaveBeenCalledTimes(2);
      expect(mockCalendarsTaskService.ensureDefaultCalendars).toHaveBeenNthCalledWith(1, { userId: 100 });
      expect(mockCalendarsTaskService.ensureDefaultCalendars).toHaveBeenNthCalledWith(2, { userId: 200 });
    });

    it("should have correct dependencies set", () => {
      expect(syncTasker.dependencies.calendarsTaskService).toBe(mockCalendarsTaskService);
      expect(syncTasker.dependencies.logger).toBe(mockLogger);
    });

    it("should not catch errors internally (caller is responsible)", async () => {
      mockCalendarsTaskService.ensureDefaultCalendars.mockRejectedValue(new Error("Unexpected"));

      let caught = false;
      try {
        await syncTasker.ensureDefaultCalendars({ userId: 1 });
      } catch {
        caught = true;
      }
      expect(caught).toBe(true);
    });

    it("should call ensureDefaultCalendars exactly once per invocation", async () => {
      mockCalendarsTaskService.ensureDefaultCalendars.mockResolvedValue(undefined);

      await syncTasker.ensureDefaultCalendars({ userId: 5 });

      expect(mockCalendarsTaskService.ensureDefaultCalendars).toHaveBeenCalledTimes(1);
    });
  });
});
