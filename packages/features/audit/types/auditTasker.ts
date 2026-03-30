import type { AuditEventTaskPayload } from "./auditEventTask";

export interface IAuditTasker {
  processEvent(payload: AuditEventTaskPayload): Promise<{ runId: string }>;
}
