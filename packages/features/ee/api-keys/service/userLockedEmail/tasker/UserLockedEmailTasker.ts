import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { Logger } from "tslog";
import type { IUserLockedEmailTasker, UserLockedEmailPayload } from "./types";
import type { UserLockedEmailSyncTasker } from "./UserLockedEmailSyncTasker";
import type { UserLockedEmailTriggerDevTasker } from "./UserLockedEmailTriggerDevTasker";

export interface UserLockedEmailTaskerDependencies {
  asyncTasker: UserLockedEmailTriggerDevTasker;
  syncTasker: UserLockedEmailSyncTasker;
  logger: Logger<unknown>;
}

export class UserLockedEmailTasker extends Tasker<IUserLockedEmailTasker> {
  constructor(dependencies: UserLockedEmailTaskerDependencies) {
    super(dependencies);
  }

  async sendEmail(payload: UserLockedEmailPayload): Promise<{ runId: string }> {
    return await this.dispatch("sendEmail", payload);
  }
}
