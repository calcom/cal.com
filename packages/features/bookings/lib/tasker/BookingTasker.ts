import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";

import { BookingSyncTasker } from "./BookingSyncTasker";
import { BookingTriggerDevTasker } from "./BookingTriggerTasker";
import { IBookingTasker } from "./types";

export interface IBookingTaskerDependencies {
  primaryTasker: BookingTriggerDevTasker | BookingSyncTasker;
  fallbackTasker: BookingSyncTasker;
  logger: ILogger;
}

export class BookingTasker extends Tasker<IBookingTasker> {
  constructor(public readonly dependencies: IBookingTaskerDependencies) {
    super(dependencies);
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
