import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRMSyncTasker } from "./crm-sync-tasker";

describe("CRMSyncTasker", () => {
  const mockCreateEvent = vi.fn();
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  let syncTasker: CRMSyncTasker;

  beforeEach(() => {
    vi.clearAllMocks();
    syncTasker = new CRMSyncTasker({
      logger: mockLogger,
      crmTaskService: {
        createEvent: mockCreateEvent,
      } as never,
    });
  });

  describe("fn: createEvent", () => {
    it("should call crmTaskService.createEvent with the payload", async () => {
      mockCreateEvent.mockResolvedValue(undefined);

      await syncTasker.createEvent({ bookingUid: "booking-abc" });

      expect(mockCreateEvent).toHaveBeenCalledWith({ bookingUid: "booking-abc" });
    });

    it("should return a runId prefixed with sync_", async () => {
      mockCreateEvent.mockResolvedValue(undefined);

      const result = await syncTasker.createEvent({ bookingUid: "booking-abc" });

      expect(result.runId).toMatch(/^sync_/);
      expect(result.runId.length).toBeGreaterThan(5);
    });

    it("should propagate errors from crmTaskService", async () => {
      mockCreateEvent.mockRejectedValue(new Error("CRM API error"));

      await expect(syncTasker.createEvent({ bookingUid: "booking-abc" })).rejects.toThrow("CRM API error");
    });

    it("should generate unique runIds for sequential calls", async () => {
      mockCreateEvent.mockResolvedValue(undefined);

      const result1 = await syncTasker.createEvent({ bookingUid: "booking-1" });
      const result2 = await syncTasker.createEvent({ bookingUid: "booking-2" });

      expect(result1.runId).not.toBe(result2.runId);
    });
  });
});
