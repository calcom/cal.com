export const AUDIT_LOG_EVENT = "audit.log";

export type AuditLogPayload = {
  teamId: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};
