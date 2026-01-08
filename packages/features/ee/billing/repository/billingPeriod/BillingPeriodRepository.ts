import { prisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";

export interface TeamWithBillingInfo {
  isOrganization: boolean;
  billing: {
    id: string;
    billingPeriod: BillingPeriod | null;
    subscriptionStart: Date | null;
    subscriptionEnd: Date | null;
    subscriptionTrialEnd: Date | null;
    pricePerSeat: number | null;
    paidSeats: number | null;
    subscriptionId: string;
  } | null;
}

export interface UpdateBillingPeriodData {
  billingPeriod: BillingPeriod;
  pricePerSeat?: number | null;
  paidSeats?: number | null;
}

export class BillingPeriodRepository {
  async getTeamWithBillingInfo(teamId: number): Promise<TeamWithBillingInfo | null> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: {
          select: {
            id: true,
            billingPeriod: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            subscriptionTrialEnd: true,
            pricePerSeat: true,
            paidSeats: true,
            subscriptionId: true,
          },
        },
        organizationBilling: {
          select: {
            id: true,
            billingPeriod: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            subscriptionTrialEnd: true,
            pricePerSeat: true,
            paidSeats: true,
            subscriptionId: true,
          },
        },
      },
    });

    if (!team) return null;

    const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;

    return {
      isOrganization: team.isOrganization,
      billing,
    };
  }

  async updateOrganizationBillingPeriod(billingId: string, data: UpdateBillingPeriodData): Promise<void> {
    await prisma.organizationBilling.update({
      where: { id: billingId },
      data,
    });
  }

  async updateTeamBillingPeriod(billingId: string, data: UpdateBillingPeriodData): Promise<void> {
    await prisma.teamBilling.update({
      where: { id: billingId },
      data,
    });
  }

  async getTeamForBillingUpdate(teamId: number) {
    return await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: { select: { id: true } },
        organizationBilling: { select: { id: true } },
      },
    });
  }
}
