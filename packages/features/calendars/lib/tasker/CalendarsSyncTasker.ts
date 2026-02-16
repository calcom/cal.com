import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { nanoid } from "nanoid";

import type { CalendarsTaskService } from "./CalendarsTaskService";
import type { ICalendarsTasker } from "./types";

export interface ICalendarsSyncTaskerDependencies {
  calendarsTaskService: CalendarsTaskService;
}

export class CalendarsSyncTasker implements ICalendarsTasker {
  constructor(public readonly dependencies: ITaskerDependencies & ICalendarsSyncTaskerDependencies) {}

  async ensureDefaultCalendars(
    payload: Parameters<ICalendarsTasker["ensureDefaultCalendars"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.calendarsTaskService.ensureDefaultCalendars(payload);
    return { runId };
  }
}
