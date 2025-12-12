import { BookingActionMap, BookingActionType } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import { SchedulingType } from "@calcom/prisma/client";
import type { INotificationTasker } from "@calcom/features/notifications/tasker/INotificationTasker";
import type { BookingNotificationSendData } from "./types";
import { IBookingEmailAndSmsTasker } from "./types";

import { BookingEmailAndSmsSyncTasker } from "./BookingEmailAndSmsSyncTasker";
import { BookingEmailAndSmsTriggerDevTasker } from "./BookingEmailAndSmsTriggerTasker";

export interface IBookingEmailAndSmsTaskerDependencies {
  asyncTasker: BookingEmailAndSmsTriggerDevTasker;
  syncTasker: BookingEmailAndSmsSyncTasker;
  logger: ILogger;
}

export class BookingEmailAndSmsTasker
  extends Tasker<IBookingEmailAndSmsTasker>
  implements INotificationTasker<BookingNotificationSendData>
{
  constructor(public readonly dependencies: IBookingEmailAndSmsTaskerDependencies) {
    super(dependencies);
  }

  public async send(data: BookingNotificationSendData): Promise<{ runId: string }> {
    const { action, schedulingType, payload } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      if (action === BookingActionMap.rescheduled) {
        if (schedulingType === "ROUND_ROBIN") {
          taskResponse = await this.dispatch("rrReschedule", payload);
        } else {
          taskResponse = await this.dispatch("reschedule", payload);
        }
      }
      if (action === BookingActionMap.confirmed) {
        taskResponse = await this.dispatch("confirm", payload);
      }
      if (action === BookingActionMap.requested) {
        taskResponse = await this.dispatch("request", payload);
      }

      this.logger.info(`BookingEmailAndSmsTasker send ${action} success:`, taskResponse, {
        bookingId: payload.bookingId,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error(`BookingEmailAndSmsTasker send ${action} failed`, taskResponse, {
        bookingId: payload.bookingId,
      });
    }

    return taskResponse;
  }
}
