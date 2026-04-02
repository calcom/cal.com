import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRMTriggerTasker } from "./crm-trigger-tasker";

const mockTrigger = vi.fn();

vi.mock("./trigger/create-crm-event", () => ({
  createCRMEventTask: {
    trigger: (...args: unknown[]) => mockTrigger(...args),
  },
}));

describe("CRMTriggerTasker", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  let triggerTasker: CRMTriggerTasker;

  beforeEach(() => {
    vi.clearAllMocks();
    triggerTasker = new CRMTriggerTasker({ logger: mockLogger });
  });

  describe("fn: createEvent", () => {
    it("should call createCRMEventTask.trigger with payload and tags", async () => {
      mockTrigger.mockResolvedValue({ id: "run-123" });

      await triggerTasker.createEvent({ bookingUid: "booking-abc" });

      expect(mockTrigger).toHaveBeenCalledWith(
        { bookingUid: "booking-abc" },
        { tags: ["booking:booking-abc"] }
      );
    });

    it("should return the runId from the trigger handle", async () => {
      mockTrigger.mockResolvedValue({ id: "run-456" });

      const result = await triggerTasker.createEvent({ bookingUid: "booking-xyz" });

      expect(result).toEqual({ runId: "run-456" });
    });

    it("should propagate errors from trigger", async () => {
      mockTrigger.mockRejectedValue(new Error("trigger.dev unavailable"));

      await expect(triggerTasker.createEvent({ bookingUid: "booking-abc" })).rejects.toThrow(
        "trigger.dev unavailable"
      );
    });
  });
});
