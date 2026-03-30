import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { IAuditTasker } from "../types/auditTasker";

export class AuditTriggerTasker implements IAuditTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async processEvent(payload: Parameters<IAuditTasker["processEvent"]>[0]): Promise<{ runId: string }> {
    const { processAuditEvent } = await import("./trigger/process-audit-event");
    const handle = await processAuditEvent.trigger(payload, {
      tags: [
        `action_${payload.action}`,
        `category_${payload.category}`,
        `org_${payload.orgId ?? "none"}`,
        `source_${payload.source}`,
      ],
    });
    return { runId: handle.id };
  }
}
