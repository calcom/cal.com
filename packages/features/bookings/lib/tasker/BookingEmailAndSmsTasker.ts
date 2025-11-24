import { BookingActionMap, BookingActionType } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import { SchedulingType } from "@calcom/prisma/client";

import { BookingEmailAndSmsSyncTasker } from "./BookingEmailAndSmsSyncTasker";
import { BookingEmailAndSmsTriggerDevTasker } from "./BookingEmailAndSmsTriggerTasker";
import { BookingEmailAndSmsTaskPayload, IBookingEmailAndSmsTasker } from "./types";

export interface IBookingEmailAndSmsTaskerDependencies {
  asyncTasker: BookingEmailAndSmsTriggerDevTasker | BookingEmailAndSmsSyncTasker;
  syncTasker: BookingEmailAndSmsSyncTasker;
  logger: ILogger;
}

export class BookingEmailAndSmsTasker extends Tasker<IBookingEmailAndSmsTasker> {
  constructor(public readonly dependencies: IBookingEmailAndSmsTaskerDependencies) {
    super(dependencies);
  }

  public async send(data: {
    action: BookingActionType;
    schedulingType: SchedulingType | null;
    payload: BookingEmailAndSmsTaskPayload;
  }): Promise<{ runId: string }> {
    const { action, schedulingType, payload } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    if (action === BookingActionMap.rescheduled) {
      if (schedulingType === "ROUND_ROBIN") return this.safeDispatch("rrReschedule", payload);
      {
        taskResponse = await this.safeDispatch("reschedule", payload);
      }
    }
    if (action === BookingActionMap.confirmed) {
      taskResponse = await this.safeDispatch("confirm", payload);
    }
    if (action === BookingActionMap.requested) {
      taskResponse = await this.safeDispatch("request", payload);
    }

    this.logger.warn("BookingEmailAndSmsTasker Tasker Send", taskResponse);

    return taskResponse;
  }
}
