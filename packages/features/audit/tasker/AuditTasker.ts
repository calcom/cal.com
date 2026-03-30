import { safeStringify } from "@calcom/lib/safeStringify";
import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import type { AuditEventTaskPayload } from "../types/auditEventTask";
import type { IAuditTasker } from "../types/auditTasker";
import type { AuditSyncTasker } from "./AuditSyncTasker";
import type { AuditTriggerTasker } from "./AuditTriggerTasker";

export interface AuditTaskerDeps {
  asyncTasker: AuditTriggerTasker;
  syncTasker: AuditSyncTasker;
  logger: ILogger;
}

export class AuditTasker extends Tasker<IAuditTasker> {
  constructor(public readonly dependencies: AuditTaskerDeps) {
    super(dependencies);
  }

  async processEvent(data: { payload: AuditEventTaskPayload }): Promise<{ runId: string }> {
    const { payload } = data;

    try {
      const taskResponse = await this.dispatch("processEvent", payload);
      this.logger.debug(
        "AuditTasker processEvent success",
        safeStringify({ runId: taskResponse.runId, action: payload.action, operationId: payload.operationId })
      );
      return taskResponse;
    } catch (error) {
      this.logger.error(
        "AuditTasker processEvent failed",
        safeStringify({ action: payload.action, operationId: payload.operationId, error: String(error) })
      );
      return { runId: "task-failed" };
    }
  }
}
