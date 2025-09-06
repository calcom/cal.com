import type { ITasker } from "../interface/infrastructure";

export class TaskerProvider {
  static async load(): Promise<ITasker> {
    const taskerModule = await import("@calcom/features/tasker");
    return taskerModule.default;
  }
}
