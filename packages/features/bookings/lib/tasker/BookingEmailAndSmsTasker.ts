import { BookingActionMap } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import { SchedulingType } from "@calcom/prisma/client";

import { BookingEmailAndSmsSyncTasker } from "./BookingEmailAndSmsSyncTasker";
import { BookingEmailAndSmsTriggerDevTasker } from "./BookingEmailAndSmsTriggerTasker";
import { BookingEmailAndSmsTaskPayload, IBookingEmailAndSmsTasker } from "./types";

export interface IBookingTaskerDependencies {
  primaryTasker: BookingEmailAndSmsTriggerDevTasker | BookingEmailAndSmsSyncTasker;
  fallbackTasker: BookingEmailAndSmsSyncTasker;
  logger: ILogger;
}

export class BookingEmailAndSmsTasker extends Tasker<IBookingEmailAndSmsTasker> {
  constructor(public readonly dependencies: IBookingTaskerDependencies) {
    super(dependencies);
  }

  public async send(data: {
    action: string;
    schedulingType: SchedulingType | null;
    payload: BookingEmailAndSmsTaskPayload;
  }) {
    const { action, schedulingType, payload } = data;

    if (action === BookingActionMap.rescheduled) {
      if (schedulingType === "ROUND_ROBIN") return this.safeDispatch("rrReschedule", payload);
      return this.safeDispatch("reschedule", payload);
    }

    if (action === BookingActionMap.confirmed) return this.safeDispatch("confirm", payload);
    if (action === BookingActionMap.requested) return this.safeDispatch("request", payload);

    this.logger.warn("Unknown email/SMS action requested.", { action });
  }
}

/* 
this is how we can now create the google calendar tasker, we will use dependency injection in web/v2 
const tasker = new GoogleCalendarTasker({
  primaryTasker: new GoogleCalendarTriggerDevTasker({ logger: logger as unknown as ILogger }),
  fallbackTasker: new GoogleCalendarSyncTasker({ logger: logger as unknown as ILogger }),
  logger: logger as unknown as ILogger,
});

tasker.dispatch("createEvent", { name: "" });
 */
