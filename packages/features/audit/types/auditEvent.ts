import type { AuditAction } from "./auditAction";
import type {
  AuditCategory,
  AuditResult,
  AuditRetentionTier,
  AuditSensitivity,
  AuditVisibility,
} from "./auditClassification";
import type { AuditSource } from "./auditSource";
import type { AuditTargetType } from "./auditTarget";

export type AuditEventCreateInput = {
  actorId: string;
  action: AuditAction;
  result: AuditResult;
  category: AuditCategory;
  source: AuditSource;
  targetType: AuditTargetType | null;
  targetId: string | null;
  previousValue: string | null;
  newValue: string | null;
  operationId: string;
  orgId: number | null;
  ipHash: string | null;
  userAgent: string | null;
  traceId: string | null;
  impersonatedBy: string | null;
  visibility: AuditVisibility;
  sensitivityLevel: AuditSensitivity;
  retentionTier: AuditRetentionTier;
};

export type AuditEvent = AuditEventCreateInput & {
  id: string;
  createdAt: Date;
  deliveredAt: Date | null;
};

export type AuditEventViewerRow = {
  id: string;
  actorId: string;
  action: AuditAction;
  result: AuditResult;
  source: AuditSource;
  targetType: string | null;
  targetId: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date;
  impersonatedBy: string | null;
  deliveredAt: Date | null;
  actor: {
    id: string;
    type: string;
    userUuid: string | null;
    name: string | null;
    createdAt: Date;
  };
};

export type PaginatedAuditEvents = {
  rows: AuditEventViewerRow[];
  meta: { totalRowCount: number };
};
