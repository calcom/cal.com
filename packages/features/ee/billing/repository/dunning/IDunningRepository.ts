import type { DunningStatus } from "@calcom/prisma/client";

export interface UpsertData {
  status: DunningStatus;
  firstFailedAt?: Date;
  lastFailedAt?: Date;
  resolvedAt?: Date | null;
  subscriptionId?: string | null;
  failedInvoiceId?: string | null;
  invoiceUrl?: string | null;
  failureReason?: string | null;
}

export interface RawDunningRecord {
  id: string;
  billingFk: string;
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

export interface RawDunningRecordForBilling {
  billingFk: string;
  teamId: number;
  status: DunningStatus;
  firstFailedAt: Date | null;
  invoiceUrl: string | null;
  failureReason: string | null;
  entityName: string | null;
  isOrganization: boolean;
}

export interface RawDunningRecordForBanner {
  teamId: number;
  entityName: string | null;
  entitySlug: string | null;
  isOrganization: boolean;
  status: DunningStatus;
  firstFailedAt: Date | null;
  subscriptionId: string | null;
  failureReason: string | null;
}

export interface IDunningRepository {
  findByBillingId(billingId: string): Promise<RawDunningRecord | null>;
  upsert(billingId: string, data: UpsertData): Promise<RawDunningRecord>;
  findEntitiesToAdvance(): Promise<RawDunningRecord[]>;
  findByBillingIds(billingIds: string[]): Promise<RawDunningRecordForBilling[]>;
  advanceStatus(billingId: string, newStatus: DunningStatus): Promise<RawDunningRecord>;
}
