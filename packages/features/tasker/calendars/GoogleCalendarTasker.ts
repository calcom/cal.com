import { BaseTaskerService } from "../SafeDispatchTasker";
import type { ILogger } from "../types/logger";
import type { GoogleCalendarSyncTasker } from "./GoogleCalendarSyncTasker";
import type { GoogleCalendarTriggerDevTasker } from "./GoogleCalendarTriggerTasker";
import type { ICalendarTasker } from "./calendar";

export interface ICalendarTaskerDependencies {
  primaryTasker: GoogleCalendarTriggerDevTasker | GoogleCalendarSyncTasker;
  fallbackTasker: GoogleCalendarSyncTasker;
  logger: ILogger;
}

export const TASKS = ["createEvent"] as const;

export class GoogleCalendarTasker extends BaseTaskerService<ICalendarTasker> {
  constructor(public readonly dependencies: ICalendarTaskerDependencies) {
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
