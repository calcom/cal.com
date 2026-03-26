import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export interface BillingInfo {
  id: string;
  subscriptionId: string;
  subscriptionItemId: string | null;
  customerId: string;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  pricePerSeat: number | null;
  billingPeriod: string | null;
  paidSeats: number | null;
}

export interface TeamWithBilling {
  id: number;
  isOrganization: boolean;
  metadata: unknown;
  billing: BillingInfo | null;
  memberCount: number;
}

export class MonthlyProrationTeamRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  async getTeamWithBilling(teamId: number): Promise<TeamWithBilling | null> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        isOrganization: true,
        metadata: true,
        teamBilling: {
          select: {
            id: true,
            subscriptionId: true,
            subscriptionItemId: true,
            customerId: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            pricePerSeat: true,
            billingPeriod: true,
            paidSeats: true,
          },
        },
        organizationBilling: {
          select: {
            id: true,
            subscriptionId: true,
            subscriptionItemId: true,
            customerId: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            pricePerSeat: true,
            billingPeriod: true,
            paidSeats: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!team) return null;

    let billing: BillingInfo | null = team.isOrganization ? team.organizationBilling : team.teamBilling;

    if (!billing) {
      billing = this.extractBillingFromMetadata(team.metadata);
    }

    return {
      id: team.id,
      isOrganization: team.isOrganization,
      metadata: team.metadata,
      billing,
      memberCount: team._count.members,
    };
  }

  async getAnnualTeamsWithSeatChanges(monthKey: string): Promise<number[]> {
    const teams = await this.prisma.team.findMany({
      where: {
        OR: [
          {
            teamBilling: {
              billingPeriod: "ANNUALLY",
              OR: [{ subscriptionTrialEnd: { lt: new Date() } }, { subscriptionTrialEnd: null }],
            },
          },
          {
            organizationBilling: {
              billingPeriod: "ANNUALLY",
              OR: [{ subscriptionTrialEnd: { lt: new Date() } }, { subscriptionTrialEnd: null }],
            },
          },
        ],
        seatChangeLogs: {
          some: {
            monthKey,
            processedInProrationId: null,
          },
        },
      },
      select: { id: true },
    });

    return teams.map((team) => team.id);
  }

  async updateBillingInfo(
    teamId: number,
    isOrganization: boolean,
    billingId: string,
    data: {
      billingPeriod?: "MONTHLY" | "ANNUALLY";
      pricePerSeat?: number;
      subscriptionStart?: Date;
      subscriptionEnd?: Date;
    }
  ): Promise<void> {
    if (!billingId) return;

    if (isOrganization) {
      await this.prisma.organizationBilling.update({
        where: { id: billingId },
        data,
      });
    } else {
      await this.prisma.teamBilling.update({
        where: { id: billingId },
        data,
      });
    }
  }

  async updatePaidSeats(
    teamId: number,
    isOrganization: boolean,
    billingId: string,
    paidSeats: number
  ): Promise<void> {
    if (!billingId) return;

    if (isOrganization) {
      await this.prisma.organizationBilling.update({
        where: { id: billingId },
        data: { paidSeats },
      });
    } else {
      await this.prisma.teamBilling.update({
        where: { id: billingId },
        data: { paidSeats },
      });
    }
  }

  async getTeamMemberCount(teamId: number): Promise<number | null> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        _count: {
          select: { members: true },
        },
      },
    });

    return team?._count.members ?? null;
  }

  async createOrganizationBilling(data: {
    teamId: number;
    subscriptionId: string;
    subscriptionItemId: string;
    customerId: string;
    status: string;
    planName: string;
    billingPeriod: "MONTHLY" | "ANNUALLY";
    pricePerSeat: number;
    paidSeats: number;
    subscriptionStart: Date | null;
    subscriptionEnd: Date | null;
    subscriptionTrialEnd: Date | null;
  }) {
    return await this.prisma.organizationBilling.create({ data });
  }

  async createTeamBilling(data: {
    teamId: number;
    subscriptionId: string;
    subscriptionItemId: string;
    customerId: string;
    status: string;
    planName: string;
    billingPeriod: "MONTHLY" | "ANNUALLY";
    pricePerSeat: number;
    paidSeats: number;
    subscriptionStart: Date | null;
    subscriptionEnd: Date | null;
    subscriptionTrialEnd: Date | null;
  }) {
    return await this.prisma.teamBilling.create({ data });
  }

  private extractBillingFromMetadata(metadata: unknown): BillingInfo | null {
    const parsed = teamMetadataSchema.parse(metadata);

    if (!parsed?.subscriptionId) {
      return null;
    }

    return {
      id: "",
      subscriptionId: parsed.subscriptionId,
      subscriptionItemId: parsed.subscriptionItemId || null,
      customerId: parsed.paymentId || "",
      subscriptionStart: null,
      subscriptionEnd: null,
      pricePerSeat: parsed.orgPricePerSeat || null,
      billingPeriod: parsed.billingPeriod || null,
      paidSeats: null,
    };
  }
}
