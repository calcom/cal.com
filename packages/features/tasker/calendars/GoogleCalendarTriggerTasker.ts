import { create } from "@calcom/trigger/tasks/calendars/create";

import type { ITaskerDependencies } from "../types/tasker";
import type { ICalendarTasker } from "./calendar";

export class GoogleCalendarTriggerDevTasker implements ICalendarTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async createEvent(payload: Parameters<ICalendarTasker["createEvent"]>[0]) {
    this.dependencies.logger.debug("createEvent", payload);
    const handle = await create.trigger({ name: payload.name });
    this.dependencies.logger.debug("createEvent handle id", handle.id);
    return { runId: handle.id };
  }

  async updateEvent(payload: Parameters<ICalendarTasker["updateEvent"]>[0]) {
    this.dependencies.logger.debug("createEvent", payload);
    const handle = await create.trigger({ name: payload.surname });
    this.dependencies.logger.debug("createEvent handle id", handle.id);
    return { runId: handle.id };
  }
}
