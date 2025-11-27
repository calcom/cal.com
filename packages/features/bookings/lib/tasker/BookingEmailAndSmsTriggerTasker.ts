import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import { IBookingEmailAndSmsTasker } from "./types";

export class BookingEmailAndSmsTriggerDevTasker implements IBookingEmailAndSmsTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async request(payload: Parameters<IBookingEmailAndSmsTasker["request"]>[0]) {
    const { request } = await import("./trigger/notifications/request");
    const handle = await request.trigger(payload);
    return { runId: handle.id };
  }

  async confirm(payload: Parameters<IBookingEmailAndSmsTasker["confirm"]>[0]) {
    const { confirm } = await import("./trigger/notifications/confirm");
    const handle = await confirm.trigger(payload);
    return { runId: handle.id };
  }

  async reschedule(payload: Parameters<IBookingEmailAndSmsTasker["reschedule"]>[0]) {
    const { reschedule } = await import("./trigger/notifications/reschedule");
    const handle = await reschedule.trigger(payload);
    return { runId: handle.id };
  }

  async rrReschedule(payload: Parameters<IBookingEmailAndSmsTasker["rrReschedule"]>[0]) {
    const { rrReschedule } = await import("./trigger/notifications/rr-reschedule");
    const handle = await rrReschedule.trigger(payload);
    return { runId: handle.id };
  }
}
