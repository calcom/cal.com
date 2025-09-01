import logger from "@calcom/lib/logger";

import { BaseTaskerService } from "../SafeDispatchTasker";
import type { ILogger } from "../types/logger";
import { GoogleCalendarSyncTasker } from "./GoogleCalendarSyncTasker";
import { GoogleCalendarTriggerDevTasker } from "./GoogleCalendarTriggerTasker";
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

const tasker = new GoogleCalendarTasker({
  primaryTasker: new GoogleCalendarTriggerDevTasker({ logger: logger as unknown as ILogger }),
  fallbackTasker: new GoogleCalendarSyncTasker({ logger: logger as unknown as ILogger }),
  logger: logger as unknown as ILogger,
});

tasker.dispatch("createEvent", { name: "" });
