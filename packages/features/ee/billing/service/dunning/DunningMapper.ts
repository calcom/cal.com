import type { DunningStatus } from "@calcom/prisma/client";

import type { RawDunningRecord, RawDunningRecordForBilling } from "../../repository/dunning/IDunningRepository";

export type DunningEntityType = "team" | "organization";

export interface DunningRecord {
  id: string;
  billingId: string;
  entityType: DunningEntityType;
  status: DunningStatus;
  firstFailedAt: Date | null;
  lastFailedAt: Date | null;
  resolvedAt: Date | null;
  subscriptionId: string | null;
  failedInvoiceId: string | null;
  invoiceUrl: string | null;
  failureReason: string | null;
  notificationsSent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DunningRecordForBilling {
  billingId: string;
  teamId: number;
  entityType: DunningEntityType;
  status: DunningStatus;
  firstFailedAt: Date | null;
  invoiceUrl: string | null;
  failureReason: string | null;
  entityName: string | null;
  isOrganization: boolean;
}

export function toDunningRecord(raw: RawDunningRecord, entityType: DunningEntityType): DunningRecord {
  return {
    id: raw.id,
    billingId: raw.billingFk,
    entityType,
    status: raw.status,
    firstFailedAt: raw.firstFailedAt,
    lastFailedAt: raw.lastFailedAt,
    resolvedAt: raw.resolvedAt,
    subscriptionId: raw.subscriptionId,
    failedInvoiceId: raw.failedInvoiceId,
    invoiceUrl: raw.invoiceUrl,
    failureReason: raw.failureReason,
    notificationsSent: raw.notificationsSent,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toDunningRecordForBilling(
  raw: RawDunningRecordForBilling,
  entityType: DunningEntityType
): DunningRecordForBilling {
  return {
    billingId: raw.billingFk,
    teamId: raw.teamId,
    entityType,
    status: raw.status,
    firstFailedAt: raw.firstFailedAt,
    invoiceUrl: raw.invoiceUrl,
    failureReason: raw.failureReason,
    entityName: raw.entityName,
    isOrganization: raw.isOrganization,
  };
}
