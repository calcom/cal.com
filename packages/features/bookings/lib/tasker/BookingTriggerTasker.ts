import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { request, confirm, rrReschedule, reschedule } from "@calcom/trigger/tasks/booking";

import { IBookingTasker } from "./types";

export class BookingTriggerDevTasker implements IBookingTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async request(payload: Parameters<IBookingTasker["request"]>[0]) {
    this.dependencies.logger.debug("request booking task", payload);
    const handle = await request.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("request booking handle id", handle.id);
    return { runId: handle.id };
  }

  async confirm(payload: Parameters<IBookingTasker["confirm"]>[0]) {
    this.dependencies.logger.debug("confirm booking task", payload);
    const handle = await confirm.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("confirm booking handle id", handle.id);
    return { runId: handle.id };
  }

  async reschedule(payload: Parameters<IBookingTasker["reschedule"]>[0]) {
    this.dependencies.logger.debug("reschedule booking task", payload);
    const handle = await reschedule.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("reschedule booking handle id", handle.id);
    return { runId: handle.id };
  }

  async rrReschedule(payload: Parameters<IBookingTasker["rrReschedule"]>[0]) {
    this.dependencies.logger.debug("reschedule round-robin bookin task", payload);
    const handle = await rrReschedule.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("reschedule round-robin handle id", handle.id);
    return { runId: handle.id };
  }
}
