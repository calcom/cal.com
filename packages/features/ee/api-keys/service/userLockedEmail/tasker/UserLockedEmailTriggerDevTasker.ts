import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { IUserLockedEmailTasker, UserLockedEmailPayload } from "./types";

export class UserLockedEmailTriggerDevTasker implements IUserLockedEmailTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async sendEmail(payload: UserLockedEmailPayload): Promise<{ runId: string }> {
    const { sendUserLockedEmailTask } = await import("./trigger/sendUserLockedEmail");
    const handle = await sendUserLockedEmailTask.trigger(payload);
    return { runId: handle.id };
  }
}
