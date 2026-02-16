import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";

export interface HighWaterMarkData {
  id: string;
  teamId: number;
  isOrganization: boolean;
  highWaterMark: number | null;
  highWaterMarkPeriodStart: Date | null;
  paidSeats: number | null;
  billingPeriod: BillingPeriod | null;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  subscriptionStart: Date | null;
}

export interface HighWaterMarkBySubscriptionData {
  id: string;
  teamId: number;
  isOrganization: boolean;
  highWaterMark: number | null;
  highWaterMarkPeriodStart: Date | null;
  paidSeats: number | null;
  billingPeriod: BillingPeriod | null;
  subscriptionId: string;
  subscriptionItemId: string;
  subscriptionStart: Date | null;
}

export class HighWaterMarkRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  async getByTeamId(teamId: number): Promise<HighWaterMarkData | null> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: {
          select: {
            id: true,
            teamId: true,
            highWaterMark: true,
            highWaterMarkPeriodStart: true,
            paidSeats: true,
            billingPeriod: true,
            subscriptionId: true,
            subscriptionItemId: true,
            customerId: true,
            subscriptionStart: true,
          },
        },
        organizationBilling: {
          select: {
            id: true,
            teamId: true,
            highWaterMark: true,
            highWaterMarkPeriodStart: true,
            paidSeats: true,
            billingPeriod: true,
            subscriptionId: true,
            subscriptionItemId: true,
            customerId: true,
            subscriptionStart: true,
          },
        },
      },
    });

    if (!team) return null;

    const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;
    if (!billing) return null;

    return {
      ...billing,
      isOrganization: team.isOrganization,
    };
  }

  async getBySubscriptionId(subscriptionId: string): Promise<HighWaterMarkBySubscriptionData | null> {
    // Try team billing first
    const teamBilling = await this.prisma.teamBilling.findUnique({
      where: { subscriptionId },
      select: {
        id: true,
        teamId: true,
        highWaterMark: true,
        highWaterMarkPeriodStart: true,
        paidSeats: true,
        billingPeriod: true,
        subscriptionId: true,
        subscriptionItemId: true,
        subscriptionStart: true,
      },
    });

    if (teamBilling) {
      return {
        ...teamBilling,
        isOrganization: false,
      };
    }

    // Try organization billing
    const orgBilling = await this.prisma.organizationBilling.findUnique({
      where: { subscriptionId },
      select: {
        id: true,
        teamId: true,
        highWaterMark: true,
        highWaterMarkPeriodStart: true,
        paidSeats: true,
        billingPeriod: true,
        subscriptionId: true,
        subscriptionItemId: true,
        subscriptionStart: true,
      },
    });

    if (orgBilling) {
      return {
        ...orgBilling,
        isOrganization: true,
      };
    }

    return null;
  }

  async setHighWaterMark(params: {
    teamId: number;
    isOrganization: boolean;
    highWaterMark: number;
    periodStart: Date;
  }): Promise<void> {
    const { teamId, isOrganization, highWaterMark, periodStart } = params;

    const updateData = {
      highWaterMark,
      highWaterMarkPeriodStart: periodStart,
    };

    if (isOrganization) {
      await this.prisma.organizationBilling.update({
        where: { teamId },
        data: updateData,
      });
    } else {
      await this.prisma.teamBilling.update({
        where: { teamId },
        data: updateData,
      });
    }
  }

  async reset(params: {
    teamId: number;
    isOrganization: boolean;
    currentSeatCount: number;
    newPeriodStart: Date;
  }): Promise<void> {
    const { teamId, isOrganization, currentSeatCount, newPeriodStart } = params;

    const updateData = {
      highWaterMark: currentSeatCount,
      highWaterMarkPeriodStart: newPeriodStart,
    };

    if (isOrganization) {
      await this.prisma.organizationBilling.update({
        where: { teamId },
        data: updateData,
      });
    } else {
      await this.prisma.teamBilling.update({
        where: { teamId },
        data: updateData,
      });
    }
  }

  async updateQuantityAfterStripeSync(params: {
    teamId: number;
    isOrganization: boolean;
    paidSeats: number;
  }): Promise<void> {
    const { teamId, isOrganization, paidSeats } = params;

    if (isOrganization) {
      await this.prisma.organizationBilling.update({
        where: { teamId },
        data: { paidSeats },
      });
    } else {
      await this.prisma.teamBilling.update({
        where: { teamId },
        data: { paidSeats },
      });
    }
  }
}
