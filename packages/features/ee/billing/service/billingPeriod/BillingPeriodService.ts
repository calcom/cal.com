import type { Logger } from "tslog";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["BillingPeriodService"] });

export interface BillingPeriodInfo {
  billingPeriod: BillingPeriod | null;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  trialEnd: Date | null;
  isInTrial: boolean;
  pricePerSeat: number | null;
  isOrganization: boolean;
}

export class BillingPeriodService {
  private logger: Logger<unknown>;

  constructor(customLogger?: Logger<unknown>) {
    this.logger = customLogger || log;
  }

  async isAnnualPlan(teamId: number): Promise<boolean> {
    const info = await this.getBillingPeriodInfo(teamId);
    return info.billingPeriod === "ANNUALLY";
  }

  async isInTrialPeriod(teamId: number): Promise<boolean> {
    const info = await this.getBillingPeriodInfo(teamId);
    return info.isInTrial;
  }

  async shouldApplyMonthlyProration(teamId: number): Promise<boolean> {
    try {
      const { checkIfFeatureIsEnabledGlobally } = await import("@calcom/features/flags/server/utils");

      const isFeatureEnabled = await checkIfFeatureIsEnabledGlobally("monthly-proration");
      if (!isFeatureEnabled) {
        return false;
      }

      const info = await this.getBillingPeriodInfo(teamId);
      return info.billingPeriod === "ANNUALLY" && !info.isInTrial && info.subscriptionStart !== null;
    } catch (error) {
      return false;
    }
  }

  async getBillingPeriodInfo(teamId: number): Promise<BillingPeriodInfo> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: {
          select: {
            billingPeriod: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            subscriptionTrialEnd: true,
            pricePerSeat: true,
          },
        },
        organizationBilling: {
          select: {
            billingPeriod: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            subscriptionTrialEnd: true,
            pricePerSeat: true,
          },
        },
      },
    });

    if (!team) throw new Error(`Team ${teamId} not found`);

    const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;

    if (!billing) {
      return {
        billingPeriod: null,
        subscriptionStart: null,
        subscriptionEnd: null,
        trialEnd: null,
        isInTrial: false,
        pricePerSeat: null,
        isOrganization: team.isOrganization,
      };
    }

    const now = new Date();
    const isInTrial = billing.subscriptionTrialEnd ? new Date(billing.subscriptionTrialEnd) > now : false;

    return {
      billingPeriod: billing.billingPeriod,
      subscriptionStart: billing.subscriptionStart,
      subscriptionEnd: billing.subscriptionEnd,
      trialEnd: billing.subscriptionTrialEnd,
      isInTrial,
      pricePerSeat: billing.pricePerSeat,
      isOrganization: team.isOrganization,
    };
  }

  async updateBillingPeriod(params: {
    teamId: number;
    billingPeriod: BillingPeriod;
    pricePerSeat: number;
  }): Promise<void> {
    const { teamId, billingPeriod, pricePerSeat } = params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: { select: { id: true } },
        organizationBilling: { select: { id: true } },
      },
    });

    if (!team) throw new Error(`Team ${teamId} not found`);

    if (team.isOrganization && team.organizationBilling) {
      await prisma.organizationBilling.update({
        where: { id: team.organizationBilling.id },
        data: { billingPeriod, pricePerSeat },
      });
    } else if (!team.isOrganization && team.teamBilling) {
      await prisma.teamBilling.update({
        where: { id: team.teamBilling.id },
        data: { billingPeriod, pricePerSeat },
      });
    } else {
      throw new Error(`No billing record found for team ${teamId}`);
    }
  }
}
