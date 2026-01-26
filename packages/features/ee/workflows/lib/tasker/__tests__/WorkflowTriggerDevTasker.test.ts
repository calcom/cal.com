import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { WorkflowTriggerDevTasker } from "../WorkflowTriggerDevTasker";

vi.mock("../trigger/scheduleRescheduleWorkflows", () => ({
  scheduleRescheduleWorkflows: {
    trigger: vi.fn().mockResolvedValue({ id: "trigger-run-123" }),
  },
}));

describe("WorkflowTriggerDevTasker", () => {
  let triggerDevTasker: WorkflowTriggerDevTasker;
  let mockLogger: ITaskerDependencies["logger"];

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ITaskerDependencies["logger"];

    triggerDevTasker = new WorkflowTriggerDevTasker({
      logger: mockLogger,
    });
  });

  describe("constructor", () => {
    it("should be instantiable with dependencies", () => {
      expect(triggerDevTasker).toBeInstanceOf(WorkflowTriggerDevTasker);
      expect(triggerDevTasker.dependencies.logger).toBe(mockLogger);
    });
  });

  describe("scheduleRescheduleWorkflows", () => {
    const basePayload = {
      bookingId: 123,
      smsReminderNumber: "+1234567890",
      hideBranding: false,
    };

    it("should trigger the scheduleRescheduleWorkflows task and return runId", async () => {
      const result = await triggerDevTasker.scheduleRescheduleWorkflows(basePayload);

      expect(result).toEqual({ runId: "trigger-run-123" });
    });

    it("should pass payload to trigger.dev task", async () => {
      const { scheduleRescheduleWorkflows } = await import("../trigger/scheduleRescheduleWorkflows");

      await triggerDevTasker.scheduleRescheduleWorkflows(basePayload);

      expect(scheduleRescheduleWorkflows.trigger).toHaveBeenCalledWith(basePayload);
    });

    it("should handle payload with seatReferenceUid", async () => {
      const { scheduleRescheduleWorkflows } = await import("../trigger/scheduleRescheduleWorkflows");

      const payloadWithSeat = {
        ...basePayload,
        seatReferenceUid: "seat-456",
      };

      await triggerDevTasker.scheduleRescheduleWorkflows(payloadWithSeat);

      expect(scheduleRescheduleWorkflows.trigger).toHaveBeenCalledWith(payloadWithSeat);
    });

    it("should handle payload with null smsReminderNumber", async () => {
      const { scheduleRescheduleWorkflows } = await import("../trigger/scheduleRescheduleWorkflows");

      const payloadWithNullSms = {
        bookingId: 789,
        smsReminderNumber: null,
        hideBranding: true,
      };

      await triggerDevTasker.scheduleRescheduleWorkflows(payloadWithNullSms);

      expect(scheduleRescheduleWorkflows.trigger).toHaveBeenCalledWith(payloadWithNullSms);
    });

    it("should propagate errors from trigger.dev", async () => {
      const { scheduleRescheduleWorkflows } = await import("../trigger/scheduleRescheduleWorkflows");
      vi.mocked(scheduleRescheduleWorkflows.trigger).mockRejectedValueOnce(new Error("Trigger failed"));

      await expect(triggerDevTasker.scheduleRescheduleWorkflows(basePayload)).rejects.toThrow(
        "Trigger failed"
      );
    });
  });
});
