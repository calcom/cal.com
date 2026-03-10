import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { nanoid } from "nanoid";
import type { BookingAuditTaskConsumer } from "./BookingAuditTaskConsumer";
import type { IBookingAuditTasker } from "./types";

export interface IBookingAuditSyncTaskerDependencies {
  bookingAuditTaskConsumer: BookingAuditTaskConsumer;
}

export class BookingAuditSyncTasker implements IBookingAuditTasker {
  constructor(public readonly dependencies: ITaskerDependencies & IBookingAuditSyncTaskerDependencies) {}

  async processAuditTask(
    payload: Parameters<IBookingAuditTasker["processAuditTask"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.bookingAuditTaskConsumer.processAuditTask(payload);
    return { runId };
  }

  async processBulkAuditTask(
    payload: Parameters<IBookingAuditTasker["processBulkAuditTask"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.bookingAuditTaskConsumer.processBulkAuditTask(payload);
    return { runId };
  }
}
