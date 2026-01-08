import { prisma } from "@calcom/prisma";
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
  async getTeamWithBilling(teamId: number): Promise<TeamWithBilling | null> {
    const team = await prisma.team.findUnique({
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
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          {
            teamBilling: {
              billingPeriod: "ANNUALLY",
              subscriptionTrialEnd: { lt: new Date() },
            },
          },
          {
            organizationBilling: {
              billingPeriod: "ANNUALLY",
              subscriptionTrialEnd: { lt: new Date() },
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
      await prisma.organizationBilling.update({
        where: { id: billingId },
        data,
      });
    } else {
      await prisma.teamBilling.update({
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
      await prisma.organizationBilling.update({
        where: { id: billingId },
        data: { paidSeats },
      });
    } else {
      await prisma.teamBilling.update({
        where: { id: billingId },
        data: { paidSeats },
      });
    }
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
