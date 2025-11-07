import { nanoid } from "nanoid";

import { BookingEmailAndSmsTaskService } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTaskService";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { IBookingEmailAndSmsTasker } from "./types";

export interface IBookingSyncTaskerDependencies {
  bookingTaskService: BookingEmailAndSmsTaskService;
}

export class BookingEmailAndSmsSyncTasker implements IBookingEmailAndSmsTasker {
  constructor(public readonly dependencies: ITaskerDependencies & IBookingSyncTaskerDependencies) {}

  async request(payload: Parameters<IBookingEmailAndSmsTasker["request"]>[0]) {
    this.dependencies.logger.info(`request booking task ${payload.bookingId}`);
    await this.dependencies.bookingTaskService.request(payload);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }

  async confirm(payload: Parameters<IBookingEmailAndSmsTasker["confirm"]>[0]) {
    this.dependencies.logger.info(`confirm booking task ${payload.bookingId}`);
    await this.dependencies.bookingTaskService.confirm(payload);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }

  async reschedule(payload: Parameters<IBookingEmailAndSmsTasker["reschedule"]>[0]) {
    this.dependencies.logger.info(`reschedule booking task ${payload.bookingId}`);
    await this.dependencies.bookingTaskService.reschedule(payload);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }

  async rrReschedule(payload: Parameters<IBookingEmailAndSmsTasker["rrReschedule"]>[0]) {
    this.dependencies.logger.info(`rrReschedule booking task ${payload.bookingId}`);
    await this.dependencies.bookingTaskService.rrReschedule(payload);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }
}
