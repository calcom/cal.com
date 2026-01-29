import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ILogger } from "@calcom/lib/tasker/types";

import type { WorkflowSyncTasker } from "../WorkflowSyncTasker";
import { WorkflowTasker } from "../WorkflowTasker";
import type { WorkflowTriggerDevTasker } from "../WorkflowTriggerDevTasker";

describe("WorkflowTasker", () => {
  let tasker: WorkflowTasker;
  let mockAsyncTasker: WorkflowTriggerDevTasker;
  let mockSyncTasker: WorkflowSyncTasker;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockAsyncTasker = {
      scheduleRescheduleWorkflows: vi.fn().mockResolvedValue({ runId: "async-run-123" }),
      dependencies: {},
    } as unknown as WorkflowTriggerDevTasker;

    mockSyncTasker = {
      scheduleRescheduleWorkflows: vi.fn().mockResolvedValue({ runId: "sync-run-123" }),
      dependencies: {},
    } as unknown as WorkflowSyncTasker;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    tasker = new WorkflowTasker({
      asyncTasker: mockAsyncTasker,
      syncTasker: mockSyncTasker,
      logger: mockLogger,
    });
  });

  describe("constructor", () => {
    it("should be instantiable with dependencies", () => {
      expect(tasker).toBeInstanceOf(WorkflowTasker);
      expect(tasker.dependencies.asyncTasker).toBe(mockAsyncTasker);
      expect(tasker.dependencies.syncTasker).toBe(mockSyncTasker);
      expect(tasker.dependencies.logger).toBe(mockLogger);
    });
  });

  describe("scheduleRescheduleWorkflows", () => {
    const basePayload = {
      bookingId: 123,
      smsReminderNumber: "+1234567890",
      hideBranding: false,
    };

    it("should dispatch and return runId on success", async () => {
      const result = await tasker.scheduleRescheduleWorkflows(basePayload);

      expect(result).toHaveProperty("runId");
      expect(result.runId).not.toBe("task-not-found");
      expect(result.runId).not.toBe("task-failed");
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("scheduleRescheduleWorkflows success"),
        expect.any(Object),
        expect.objectContaining({ bookingId: 123 })
      );
    });

    it("should return task-failed runId when dispatch fails", async () => {
      vi.mocked(mockSyncTasker.scheduleRescheduleWorkflows).mockRejectedValue(
        new Error("Dispatch failed")
      );

      const result = await tasker.scheduleRescheduleWorkflows(basePayload);

      expect(result).toEqual({ runId: "task-failed" });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("scheduleRescheduleWorkflows failed"),
        expect.objectContaining({ runId: "task-failed" }),
        expect.objectContaining({ bookingId: 123 })
      );
    });

    it("should pass payload correctly to dispatch", async () => {
      const payloadWithSeat = {
        ...basePayload,
        seatReferenceUid: "seat-456",
      };

      await tasker.scheduleRescheduleWorkflows(payloadWithSeat);

      expect(mockSyncTasker.scheduleRescheduleWorkflows).toHaveBeenCalledWith(payloadWithSeat);
    });

    it("should handle null smsReminderNumber", async () => {
      const payloadWithNullSms = {
        bookingId: 123,
        smsReminderNumber: null,
        hideBranding: true,
      };

      const result = await tasker.scheduleRescheduleWorkflows(payloadWithNullSms);

      expect(result).toHaveProperty("runId");
      expect(result.runId).not.toBe("task-failed");
      expect(mockSyncTasker.scheduleRescheduleWorkflows).toHaveBeenCalledWith(payloadWithNullSms);
    });
  });
});
