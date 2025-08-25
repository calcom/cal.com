import type { ITasker } from "../interface";

export class TaskerProvider {
  static async load(): Promise<ITasker> {
    const taskerModule = await import("@calcom/features/tasker");
    return taskerModule.default;
  }
}
