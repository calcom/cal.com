import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import type { TriggerOptions } from "@trigger.dev/sdk";
import type { CalendarsSyncTasker } from "./CalendarsSyncTasker";
import type { CalendarsTriggerTasker } from "./CalendarsTriggerTasker";
import type { CalendarsTaskPayload, ICalendarsTasker } from "./types";

export interface ICalendarsTaskerDependencies {
  asyncTasker: CalendarsTriggerTasker;
  syncTasker: CalendarsSyncTasker;
  logger: ILogger;
}

export class CalendarsTasker extends Tasker<ICalendarsTasker> {
  constructor(public readonly dependencies: ICalendarsTaskerDependencies) {
    super(dependencies);
  }

  public async ensureDefaultCalendars(data: {
    payload: CalendarsTaskPayload;
    options?: TriggerOptions;
  }): Promise<{ runId: string }> {
    const { payload } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("ensureDefaultCalendars", payload, data.options);

      this.logger.info(`CalendarsTasker ensureDefaultCalendars success:`, taskResponse, {
        userId: payload.userId,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error(`CalendarsTasker ensureDefaultCalendars failed`, taskResponse, {
        userId: payload.userId,
      });
    }

    return taskResponse;
  }
}
