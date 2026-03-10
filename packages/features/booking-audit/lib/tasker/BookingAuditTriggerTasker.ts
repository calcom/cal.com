import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { IBookingAuditTasker } from "./types";

export class BookingAuditTriggerTasker implements IBookingAuditTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async processAuditTask(
    payload: Parameters<IBookingAuditTasker["processAuditTask"]>[0]
  ): Promise<{ runId: string }> {
    const { processAuditTask } = await import("./trigger/process-audit-task");
    const handle = await processAuditTask.trigger(payload, {
      tags: [
        `action_${payload.action}`,
        `org_${payload.organizationId ?? "none"}`,
        `booking_${payload.bookingUid}`,
        `source_${payload.source}`,
        `op_${payload.operationId}`,
      ],
    });
    return { runId: handle.id };
  }

  async processBulkAuditTask(
    payload: Parameters<IBookingAuditTasker["processBulkAuditTask"]>[0]
  ): Promise<{ runId: string }> {
    const { processBulkAuditTask } = await import("./trigger/process-bulk-audit-task");
    const handle = await processBulkAuditTask.trigger(payload, {
      tags: [
        `action_${payload.action}`,
        `org_${payload.organizationId ?? "none"}`,
        `source_${payload.source}`,
        `op_${payload.operationId}`,
        "bulk",
      ],
    });
    return { runId: handle.id };
  }
}
