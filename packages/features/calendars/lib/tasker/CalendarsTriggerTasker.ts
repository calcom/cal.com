import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { TriggerOptions } from "@trigger.dev/sdk";
import type { ICalendarsTasker } from "./types";

export class CalendarsTriggerTasker implements ICalendarsTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async ensureDefaultCalendars(
    payload: Parameters<ICalendarsTasker["ensureDefaultCalendars"]>[0],
    options?: TriggerOptions
  ): Promise<{ runId: string }> {
    const { ensureDefaultCalendars } = await import("./trigger/ensure-default-calendars");
    const handle = await ensureDefaultCalendars.trigger(payload, options);
    return { runId: handle.id };
  }
}
