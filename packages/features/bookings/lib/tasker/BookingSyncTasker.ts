import { nanoid } from "nanoid";

import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { IBookingTasker } from "./types";

export class BookingSyncTasker implements IBookingTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async request(payload: Parameters<IBookingTasker["request"]>[0]) {
    this.dependencies.logger.info(`request booking task ${payload.bookingId}`);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }

  async confirm(payload: Parameters<IBookingTasker["confirm"]>[0]) {
    this.dependencies.logger.info(`confirm booking task ${payload.bookingId}`);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }

  async reschedule(payload: Parameters<IBookingTasker["reschedule"]>[0]) {
    this.dependencies.logger.info(`reschedule booking task ${payload.bookingId}`);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }

  async rrReschedule(payload: Parameters<IBookingTasker["rrReschedule"]>[0]) {
    this.dependencies.logger.info(`rrReschedule booking task ${payload.bookingId}`);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }
}
