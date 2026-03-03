import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import type { DunningStatus } from "@calcom/prisma/client";

import type {
  IDunningRepository,
  RawDunningRecord,
  RawDunningRecordForBanner,
  RawDunningRecordForBilling,
  UpsertData,
} from "./IDunningRepository";

const selectFields = {
  id: true,
  teamBillingId: true,
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

export class TeamDunningRepository implements IDunningRepository {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  async findByBillingId(billingId: string): Promise<RawDunningRecord | null> {
    const r = await this.prisma.teamDunningStatus.findUnique({
      where: { teamBillingId: billingId },
      select: selectFields,
    });
    return r ? { ...r, billingFk: r.teamBillingId } : null;
  }

  async upsert(billingId: string, data: UpsertData): Promise<RawDunningRecord> {
    const r = await this.prisma.teamDunningStatus.upsert({
      where: { teamBillingId: billingId },
      create: { teamBillingId: billingId, ...data },
      update: data,
      select: selectFields,
    });
    return { ...r, billingFk: r.teamBillingId };
  }

  async findEntitiesToAdvance(): Promise<RawDunningRecord[]> {
    const results = await this.prisma.teamDunningStatus.findMany({
      where: { status: { in: ["WARNING", "SOFT_BLOCKED", "HARD_BLOCKED"] }, resolvedAt: null },
      select: selectFields,
    });
    return results.map((r) => ({ ...r, billingFk: r.teamBillingId }));
  }

  async findByBillingIds(billingIds: string[]): Promise<RawDunningRecordForBilling[]> {
    const results = await this.prisma.teamDunningStatus.findMany({
      where: { teamBillingId: { in: billingIds }, status: { not: "CURRENT" } },
      select: {
        teamBillingId: true,
        status: true,
        firstFailedAt: true,
        invoiceUrl: true,
        failureReason: true,
        teamBilling: {
          select: { teamId: true, team: { select: { name: true, isOrganization: true } } },
        },
      },
    });
    return results.map((r) => ({
      billingFk: r.teamBillingId,
      teamId: r.teamBilling.teamId,
      status: r.status,
      firstFailedAt: r.firstFailedAt,
      invoiceUrl: r.invoiceUrl,
      failureReason: r.failureReason,
      entityName: r.teamBilling.team?.name ?? null,
      isOrganization: r.teamBilling.team?.isOrganization ?? false,
    }));
  }

  async findByTeamIds(teamIds: number[]): Promise<RawDunningRecordForBanner[]> {
    const results = await this.prisma.teamDunningStatus.findMany({
      where: {
        teamBilling: { teamId: { in: teamIds } },
        status: { not: "CURRENT" },
      },
      select: {
        status: true,
        firstFailedAt: true,
        subscriptionId: true,
        failureReason: true,
        teamBilling: {
          select: {
            teamId: true,
            team: { select: { name: true, slug: true, isOrganization: true } },
          },
        },
      },
    });
    return results.map((r) => ({
      teamId: r.teamBilling.teamId,
      entityName: r.teamBilling.team?.name ?? null,
      entitySlug: r.teamBilling.team?.slug ?? null,
      isOrganization: r.teamBilling.team?.isOrganization ?? false,
      status: r.status,
      firstFailedAt: r.firstFailedAt,
      subscriptionId: r.subscriptionId,
      failureReason: r.failureReason,
    }));
  }

  async advanceStatus(billingId: string, newStatus: DunningStatus): Promise<RawDunningRecord> {
    const r = await this.prisma.teamDunningStatus.update({
      where: { teamBillingId: billingId },
      data: { status: newStatus },
      select: selectFields,
    });
    return { ...r, billingFk: r.teamBillingId };
  }
}
