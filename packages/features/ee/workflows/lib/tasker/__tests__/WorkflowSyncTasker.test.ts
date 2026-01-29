import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { WorkflowSyncTasker } from "../WorkflowSyncTasker";
import type { WorkflowTaskService } from "../WorkflowTaskService";

describe("WorkflowSyncTasker", () => {
  let syncTasker: WorkflowSyncTasker;
  let mockWorkflowTaskService: WorkflowTaskService;
  let mockLogger: ITaskerDependencies["logger"];

  beforeEach(() => {
    mockWorkflowTaskService = {
      scheduleRescheduleWorkflows: vi.fn().mockResolvedValue(undefined),
      dependencies: {},
    } as unknown as WorkflowTaskService;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ITaskerDependencies["logger"];

    syncTasker = new WorkflowSyncTasker({
      workflowTaskService: mockWorkflowTaskService,
      logger: mockLogger,
    });
  });

  describe("constructor", () => {
    it("should be instantiable with dependencies", () => {
      expect(syncTasker).toBeInstanceOf(WorkflowSyncTasker);
      expect(syncTasker.dependencies.workflowTaskService).toBe(mockWorkflowTaskService);
      expect(syncTasker.dependencies.logger).toBe(mockLogger);
    });
  });

  describe("scheduleRescheduleWorkflows", () => {
    const basePayload = {
      bookingId: 123,
      smsReminderNumber: "+1234567890",
      hideBranding: false,
    };

    it("should call workflowTaskService.scheduleRescheduleWorkflows with payload", async () => {
      await syncTasker.scheduleRescheduleWorkflows(basePayload);

      expect(mockWorkflowTaskService.scheduleRescheduleWorkflows).toHaveBeenCalledWith(basePayload);
    });

    it("should return a runId with sync_ prefix", async () => {
      const result = await syncTasker.scheduleRescheduleWorkflows(basePayload);

      expect(result).toHaveProperty("runId");
      expect(result.runId).toMatch(/^sync_/);
    });

    it("should generate unique runIds for each call", async () => {
      const result1 = await syncTasker.scheduleRescheduleWorkflows(basePayload);
      const result2 = await syncTasker.scheduleRescheduleWorkflows(basePayload);

      expect(result1.runId).not.toBe(result2.runId);
    });

    it("should propagate errors from workflowTaskService", async () => {
      const error = new Error("Service failed");
      vi.mocked(mockWorkflowTaskService.scheduleRescheduleWorkflows).mockRejectedValue(error);

      await expect(syncTasker.scheduleRescheduleWorkflows(basePayload)).rejects.toThrow("Service failed");
    });

    it("should handle payload with seatReferenceUid", async () => {
      const payloadWithSeat = {
        ...basePayload,
        seatReferenceUid: "seat-789",
      };

      await syncTasker.scheduleRescheduleWorkflows(payloadWithSeat);

      expect(mockWorkflowTaskService.scheduleRescheduleWorkflows).toHaveBeenCalledWith(payloadWithSeat);
    });

    it("should handle payload with null smsReminderNumber", async () => {
      const payloadWithNullSms = {
        bookingId: 456,
        smsReminderNumber: null,
        hideBranding: true,
      };

      const result = await syncTasker.scheduleRescheduleWorkflows(payloadWithNullSms);

      expect(result).toHaveProperty("runId");
      expect(mockWorkflowTaskService.scheduleRescheduleWorkflows).toHaveBeenCalledWith(payloadWithNullSms);
    });
  });
});
