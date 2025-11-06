import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { request, confirm, rrReschedule, reschedule } from "./trigger/index";
import { IBookingEmailAndSmsTasker } from "./types";

export class BookingEmailAndSmsTriggerDevTasker implements IBookingEmailAndSmsTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async request(payload: Parameters<IBookingEmailAndSmsTasker["request"]>[0]) {
    this.dependencies.logger.debug("request booking task with trigger.dev", payload);
    const handle = await request.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("request booking handle id with trigger.dev", handle.id);
    return { runId: handle.id };
  }

  async confirm(payload: Parameters<IBookingEmailAndSmsTasker["confirm"]>[0]) {
    this.dependencies.logger.debug("confirm booking task", payload);
    const handle = await confirm.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("confirm trigger.dev booking handle id with trigger.dev", handle.id);
    return { runId: handle.id };
  }

  async reschedule(payload: Parameters<IBookingEmailAndSmsTasker["reschedule"]>[0]) {
    this.dependencies.logger.debug("reschedule booking task", payload);
    const handle = await reschedule.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug("reschedule trigger.dev booking handle id with trigger.dev", handle.id);
    return { runId: handle.id };
  }

  async rrReschedule(payload: Parameters<IBookingEmailAndSmsTasker["rrReschedule"]>[0]) {
    this.dependencies.logger.debug("reschedule round-robin bookin task", payload);
    const handle = await rrReschedule.trigger({ bookingId: payload.bookingId });
    this.dependencies.logger.debug(
      "reschedule trigger.dev round-robin handle id with trigger.dev",
      handle.id
    );
    return { runId: handle.id };
  }
}
