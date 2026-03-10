import { safeStringify } from "@calcom/lib/safeStringify";
import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import type { BookingAuditSyncTasker } from "./BookingAuditSyncTasker";
import type { BookingAuditTriggerTasker } from "./BookingAuditTriggerTasker";
import type {
  BulkBookingAuditTaskConsumerPayload,
  SingleBookingAuditTaskConsumerPayload,
} from "./trigger/schema";
import type { IBookingAuditTasker } from "./types";

export interface IBookingAuditTaskerDependencies {
  asyncTasker: BookingAuditTriggerTasker;
  syncTasker: BookingAuditSyncTasker;
  logger: ILogger;
}

export class BookingAuditTasker extends Tasker<IBookingAuditTasker> {
  constructor(public readonly dependencies: IBookingAuditTaskerDependencies) {
    super(dependencies);
  }

  public async processAuditTask(data: {
    payload: SingleBookingAuditTaskConsumerPayload;
  }): Promise<{ runId: string }> {
    const { payload } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("processAuditTask", payload);

      this.logger.debug(
        "BookingAuditTasker processAuditTask success",
        safeStringify({ ...taskResponse, bookingUid: payload.bookingUid, action: payload.action })
      );
    } catch (error) {
      taskResponse = { runId: "task-failed" };
      this.logger.error(
        "BookingAuditTasker processAuditTask failed",
        safeStringify({ ...taskResponse, bookingUid: payload.bookingUid, action: payload.action, error: String(error) })
      );
    }

    return taskResponse;
  }

  public async processBulkAuditTask(data: {
    payload: BulkBookingAuditTaskConsumerPayload;
  }): Promise<{ runId: string }> {
    const { payload } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("processBulkAuditTask", payload);

      this.logger.debug(
        "BookingAuditTasker processBulkAuditTask success",
        safeStringify({ ...taskResponse, bookingCount: payload.bookings.length, action: payload.action })
      );
    } catch (error) {
      taskResponse = { runId: "task-failed" };
      this.logger.error(
        "BookingAuditTasker processBulkAuditTask failed",
        safeStringify({ ...taskResponse, bookingCount: payload.bookings.length, action: payload.action, error: String(error) })
      );
    }

    return taskResponse;
  }
}
