import type { PrismaClient } from "@calcom/prisma";

export type AdminBillingRecord = {
  id: string;
  customerId: string;
  subscriptionId: string;
  subscriptionItemId: string | null;
  status: string;
  planName: string;
  billingPeriod: string | null;
  billingMode: string;
  pricePerSeat: number | null;
  paidSeats: number | null;
  minSeats: number | null;
  highWaterMark: number | null;
  highWaterMarkPeriodStart: Date | null;
  subscriptionStart: Date | null;
  subscriptionTrialEnd: Date | null;
  subscriptionEnd: Date | null;
  teamId: number;
  dunningStatus: {
    status: string;
    firstFailedAt: Date | null;
    lastFailedAt: Date | null;
    failureReason: string | null;
    invoiceUrl: string | null;
    notificationsSent: number;
  } | null;
  team: {
    id: number;
    name: string;
    slug: string | null;
    isOrganization: boolean;
  } | null;
};

export type AdminBillingTransferRecord = {
  id: string;
  customerId: string;
  subscriptionId: string;
  subscriptionItemId: string | null;
  teamId: number;
};

export type AdminBillingWithEntity = {
  record: AdminBillingRecord;
  entityType: "team" | "organization";
};

const billingSelect = {
  id: true,
  customerId: true,
  subscriptionId: true,
  subscriptionItemId: true,
  status: true,
  planName: true,
  billingPeriod: true,
  billingMode: true,
  pricePerSeat: true,
  paidSeats: true,
  minSeats: true,
  highWaterMark: true,
  highWaterMarkPeriodStart: true,
  subscriptionStart: true,
  subscriptionTrialEnd: true,
  subscriptionEnd: true,
  teamId: true,
  dunningStatus: {
    select: {
      status: true,
      firstFailedAt: true,
      lastFailedAt: true,
      failureReason: true,
      invoiceUrl: true,
      notificationsSent: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      slug: true,
      isOrganization: true,
    },
  },
} as const;

const transferSelect = {
  id: true,
  customerId: true,
  subscriptionId: true,
  subscriptionItemId: true,
  teamId: true,
} as const;

export class AdminBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByCustomerId(customerId: string): Promise<AdminBillingWithEntity[]> {
    const [teamBillings, orgBillings] = await Promise.all([
      this.prismaClient.teamBilling.findMany({
        where: { customerId },
        select: billingSelect,
      }),
      this.prismaClient.organizationBilling.findMany({
        where: { customerId },
        select: billingSelect,
      }),
    ]);

    return [
      ...teamBillings.map((record) => ({ record, entityType: "team" as const })),
      ...orgBillings.map((record) => ({ record, entityType: "organization" as const })),
    ];
  }

  async findTeamBillingById(billingId: string): Promise<AdminBillingTransferRecord | null> {
    return this.prismaClient.teamBilling.findUnique({
      where: { id: billingId },
      select: transferSelect,
    });
  }

  async findOrgBillingById(billingId: string): Promise<AdminBillingTransferRecord | null> {
    return this.prismaClient.organizationBilling.findUnique({
      where: { id: billingId },
      select: transferSelect,
    });
  }

  async findTeamWithMetadata(teamId: number): Promise<{ name: string; metadata: unknown } | null> {
    return this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: { name: true, metadata: true },
    });
  }

  async transferTeamBilling(
    billingId: string,
    billingData: { customerId: string; subscriptionId: string; subscriptionItemId: string },
    metadataUpdate: { teamId: number; currentMetadata: Record<string, unknown> } | null
  ): Promise<void> {
    await this.prismaClient.$transaction(async (tx) => {
      await tx.teamBilling.update({ where: { id: billingId }, data: billingData });

      if (metadataUpdate) {
        await tx.team.update({
          where: { id: metadataUpdate.teamId },
          data: {
            metadata: {
              ...metadataUpdate.currentMetadata,
              subscriptionId: billingData.subscriptionId,
              subscriptionItemId: billingData.subscriptionItemId,
            },
          },
        });
      }
    });
  }

  async transferOrgBilling(
    billingId: string,
    billingData: { customerId: string; subscriptionId: string; subscriptionItemId: string },
    metadataUpdate: { teamId: number; currentMetadata: Record<string, unknown> } | null
  ): Promise<void> {
    await this.prismaClient.$transaction(async (tx) => {
      await tx.organizationBilling.update({ where: { id: billingId }, data: billingData });

      if (metadataUpdate) {
        await tx.team.update({
          where: { id: metadataUpdate.teamId },
          data: {
            metadata: {
              ...metadataUpdate.currentMetadata,
              subscriptionId: billingData.subscriptionId,
              subscriptionItemId: billingData.subscriptionItemId,
            },
          },
        });
      }
    });
  }
}
