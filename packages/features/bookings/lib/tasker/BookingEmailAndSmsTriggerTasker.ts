import { configure } from "@trigger.dev/sdk";

import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { IBookingEmailAndSmsTasker } from "./types";

export class BookingEmailAndSmsTriggerDevTasker implements IBookingEmailAndSmsTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {
    configure({
      accessToken: process.env.TRIGGER_SECRET_KEY,
      baseURL: process.env.TRIGGER_API_URL,
    });
  }

  async request(payload: Parameters<IBookingEmailAndSmsTasker["request"]>[0]) {
    try {
      this.dependencies.logger.debug("request booking task with trigger.dev", payload);
      const { request } = await import("./trigger/notifications/request");
      const handle = await request.trigger({ bookingId: payload.bookingId });
      this.dependencies.logger.debug("request booking handle id with trigger.dev", handle.id);
      return { runId: handle.id };
    } catch (err) {
      this.dependencies.logger.error(err);
      return { runId: "error" };
    }
  }

  async confirm(payload: Parameters<IBookingEmailAndSmsTasker["confirm"]>[0]) {
    try {
      this.dependencies.logger.debug("confirm booking task with trigger.dev", payload);
      const { confirm } = await import("./trigger/notifications/confirm");
      const handle = await confirm.trigger({ bookingId: payload.bookingId });
      this.dependencies.logger.debug("confirm trigger.dev booking handle id with trigger.dev", handle.id);
      return { runId: handle.id };
    } catch (err) {
      this.dependencies.logger.error(err);
      return { runId: "error" };
    }
  }

  async reschedule(payload: Parameters<IBookingEmailAndSmsTasker["reschedule"]>[0]) {
    try {
      this.dependencies.logger.debug("reschedule booking task with trigger.dev", payload);
      const { reschedule } = await import("./trigger/notifications/reschedule");
      const handle = await reschedule.trigger({ bookingId: payload.bookingId });
      this.dependencies.logger.debug("reschedule trigger.dev booking handle id with trigger.dev", handle.id);
      return { runId: handle.id };
    } catch (err) {
      this.dependencies.logger.error(err);
      return { runId: "error" };
    }
  }

  async rrReschedule(payload: Parameters<IBookingEmailAndSmsTasker["rrReschedule"]>[0]) {
    try {
      this.dependencies.logger.debug("reschedule round-robin bookin task with trigger.dev", payload);
      const { rrReschedule } = await import("./trigger/notifications/rr-reschedule");
      const handle = await rrReschedule.trigger({ bookingId: payload.bookingId });
      this.dependencies.logger.debug(
        "reschedule trigger.dev round-robin handle id with trigger.dev",
        handle.id
      );
      return { runId: handle.id };
    } catch (err) {
      this.dependencies.logger.error(err);
      return { runId: "error" };
    }
  }
}
