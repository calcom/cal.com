import type { BookingEmailAndSmsTaskService } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTaskService";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { nanoid } from "nanoid";
import type { IBookingEmailAndSmsTasker } from "./types";

export interface IBookingSyncTaskerDependencies {
  bookingTaskService: BookingEmailAndSmsTaskService;
}

export class BookingEmailAndSmsSyncTasker implements IBookingEmailAndSmsTasker {
  constructor(public readonly dependencies: ITaskerDependencies & IBookingSyncTaskerDependencies) {}

  async request(payload: Parameters<IBookingEmailAndSmsTasker["request"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.bookingTaskService.request(payload);
    return { runId };
  }

  async confirm(payload: Parameters<IBookingEmailAndSmsTasker["confirm"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.bookingTaskService.confirm(payload);
    return { runId };
  }

  async reschedule(payload: Parameters<IBookingEmailAndSmsTasker["reschedule"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.bookingTaskService.reschedule(payload);
    return { runId };
  }

  async rrReschedule(payload: Parameters<IBookingEmailAndSmsTasker["rrReschedule"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.bookingTaskService.rrReschedule(payload);
    return { runId };
  }
}
