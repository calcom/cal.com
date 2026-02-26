import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import type { DunningStatus } from "@calcom/prisma/client";

import type { IDunningRepository, RawDunningRecord, RawDunningRecordForBilling, UpsertData } from "./IDunningRepository";

const selectFields = {
  id: true,
  organizationBillingId: true,
  status: true,
  firstFailedAt: true,
  lastFailedAt: true,
  resolvedAt: true,
  subscriptionId: true,
  failedInvoiceId: true,
  invoiceUrl: true,
  failureReason: true,
  notificationsSent: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class OrgDunningRepository implements IDunningRepository {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  async findByBillingId(billingId: string): Promise<RawDunningRecord | null> {
    const r = await this.prisma.organizationDunningStatus.findUnique({
      where: { organizationBillingId: billingId },
      select: selectFields,
    });
    return r ? { ...r, billingFk: r.organizationBillingId } : null;
  }

  async upsert(billingId: string, data: UpsertData): Promise<RawDunningRecord> {
    const r = await this.prisma.organizationDunningStatus.upsert({
      where: { organizationBillingId: billingId },
      create: { organizationBillingId: billingId, ...data },
      update: data,
      select: selectFields,
    });
    return { ...r, billingFk: r.organizationBillingId };
  }

  async findEntitiesToAdvance(): Promise<RawDunningRecord[]> {
    const results = await this.prisma.organizationDunningStatus.findMany({
      where: { status: { in: ["WARNING", "SOFT_BLOCKED", "HARD_BLOCKED"] }, resolvedAt: null },
      select: selectFields,
    });
    return results.map((r) => ({ ...r, billingFk: r.organizationBillingId }));
  }

  async findByBillingIds(billingIds: string[]): Promise<RawDunningRecordForBilling[]> {
    const results = await this.prisma.organizationDunningStatus.findMany({
      where: { organizationBillingId: { in: billingIds }, status: { not: "CURRENT" } },
      select: {
        organizationBillingId: true,
        status: true,
        firstFailedAt: true,
        invoiceUrl: true,
        failureReason: true,
        organizationBilling: {
          select: { teamId: true, team: { select: { name: true, isOrganization: true } } },
        },
      },
    });
    return results.map((r) => ({
      billingFk: r.organizationBillingId,
      teamId: r.organizationBilling.teamId,
      status: r.status,
      firstFailedAt: r.firstFailedAt,
      invoiceUrl: r.invoiceUrl,
      failureReason: r.failureReason,
      entityName: r.organizationBilling.team?.name ?? null,
      isOrganization: r.organizationBilling.team?.isOrganization ?? false,
    }));
  }

  async advanceStatus(billingId: string, newStatus: DunningStatus): Promise<RawDunningRecord> {
    const r = await this.prisma.organizationDunningStatus.update({
      where: { organizationBillingId: billingId },
      data: { status: newStatus },
      select: selectFields,
    });
    return { ...r, billingFk: r.organizationBillingId };
  }
}
