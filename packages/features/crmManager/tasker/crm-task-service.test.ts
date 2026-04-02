import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateCRMEvent = vi.fn();

vi.mock("@calcom/features/tasker/tasks/crm/createCRMEvent", () => ({
  createCRMEvent: mockCreateCRMEvent,
}));

import { CRMTaskService } from "./crm-task-service";

describe("CRMTaskService", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  let service: CRMTaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CRMTaskService({
      logger: mockLogger,
    });
  });

  describe("fn: createEvent", () => {
    it("should call createCRMEvent with stringified payload", async () => {
      mockCreateCRMEvent.mockResolvedValue(undefined);

      await service.createEvent({ bookingUid: "booking-abc" });

      expect(mockCreateCRMEvent).toHaveBeenCalledWith(JSON.stringify({ bookingUid: "booking-abc" }));
    });

    it("should log success after createCRMEvent completes", async () => {
      mockCreateCRMEvent.mockResolvedValue(undefined);

      await service.createEvent({ bookingUid: "booking-abc" });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully created CRM event",
        expect.objectContaining({ bookingUid: "booking-abc" })
      );
    });

    it("should log error and rethrow when createCRMEvent fails", async () => {
      const error = new Error("CRM API error");
      mockCreateCRMEvent.mockRejectedValue(error);

      await expect(service.createEvent({ bookingUid: "booking-abc" })).rejects.toThrow("CRM API error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to create CRM event",
        expect.objectContaining({
          bookingUid: "booking-abc",
          error: "CRM API error",
        })
      );
    });

    it("should handle non-Error throws gracefully", async () => {
      mockCreateCRMEvent.mockRejectedValue("string error");

      await expect(service.createEvent({ bookingUid: "booking-abc" })).rejects.toBe("string error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to create CRM event",
        expect.objectContaining({
          bookingUid: "booking-abc",
          error: "Unknown error",
        })
      );
    });
  });
});
