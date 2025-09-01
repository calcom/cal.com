import { nanoid } from "nanoid";

import type { ITaskerDependencies } from "../types/tasker";
import type { ICalendarTasker } from "./calendar";

export class GoogleCalendarSyncTasker implements ICalendarTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async createEvent(payload: Parameters<ICalendarTasker["createEvent"]>[0]) {
    this.dependencies.logger.info(`Hello ${payload.name}`);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }
  async updateEvent(payload: Parameters<ICalendarTasker["updateEvent"]>[0]) {
    this.dependencies.logger.info(`Hello ${payload.surname}`);
    const runId = `sync_${nanoid(10)}`;
    return { runId };
  }
}
