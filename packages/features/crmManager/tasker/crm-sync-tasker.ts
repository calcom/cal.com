import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { nanoid } from "nanoid";
import type { CRMTaskService } from "./crm-task-service";
import type { CRMTaskPayload, ICRMTasker } from "./types";

export interface ICRMSyncTaskerDependencies {
  crmTaskService: CRMTaskService;
}

export class CRMSyncTasker implements ICRMTasker {
  constructor(public readonly dependencies: ITaskerDependencies & ICRMSyncTaskerDependencies) {}

  async createEvent(payload: CRMTaskPayload): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.crmTaskService.createEvent(payload);
    return { runId };
  }
}
