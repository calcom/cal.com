import type {
  AuditEvent,
  AuditEventCreateInput,
  AuditEventViewerRow,
  PaginatedAuditEvents,
} from "../types/auditEvent";
import type { AuditTargetType } from "../types/auditTarget";

export type { AuditEvent, AuditEventCreateInput, AuditEventViewerRow, PaginatedAuditEvents };

export interface IAuditEventRepository {
  create(auditEvent: AuditEventCreateInput): Promise<AuditEvent>;
  createMany(auditEvents: AuditEventCreateInput[]): Promise<{ count: number }>;

  findByOrgId(orgId: number, limit: number, offset: number): Promise<PaginatedAuditEvents>;
  findByActorId(actorId: string, limit: number, offset: number): Promise<PaginatedAuditEvents>;

  findByTargetTypeAndId(
    targetType: AuditTargetType,
    targetId: string,
    limit: number,
    offset: number
  ): Promise<PaginatedAuditEvents>;
}
