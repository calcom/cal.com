import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import stripe from "@calcom/features/ee/payments/server/stripe";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";
import type { Logger } from "tslog";

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
  constructor(customLogger?: Logger<unknown>) {
    this.logger = customLogger || log;
  }

  async isAnnualPlan(teamId: number): Promise<boolean> {
    const info = await this.getOrCreateBillingPeriodInfo(teamId);
    return info.billingPeriod === "ANNUALLY";
  }

  async isInTrialPeriod(teamId: number): Promise<boolean> {
    const info = await this.getOrCreateBillingPeriodInfo(teamId);
    return info.isInTrial;
  }

  async shouldApplyMonthlyProration(teamId: number): Promise<boolean> {
    try {
      const featuresRepository = new FeaturesRepository(prisma);
      const isFeatureEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");

      if (!isFeatureEnabled) {
        return false;
      }

      const info = await this.getOrCreateBillingPeriodInfo(teamId);
      return info.billingPeriod === "ANNUALLY" && !info.isInTrial && info.subscriptionStart !== null;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Gets billing period info for a team, backfilling from Stripe if missing.
   * This method will automatically fetch and persist billing data from Stripe
   * if the team has a subscription but missing billing period information.
   */
  async getOrCreateBillingPeriodInfo(teamId: number): Promise<BillingPeriodInfo> {
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

    // Backfill missing billing data from Stripe
    if (!billing.billingPeriod && billing.subscriptionId) {
      log.info(
        `Backfilling missing billing data for team ${teamId} from Stripe subscription ${billing.subscriptionId}`
      );

      try {
        const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);
        const { billingPeriod, pricePerSeat, paidSeats } =
          extractBillingDataFromStripeSubscription(subscription);

        // Update the database
        if (team.isOrganization && team.organizationBilling) {
          await prisma.organizationBilling.update({
            where: { id: team.organizationBilling.id },
            data: {
              billingPeriod,
              pricePerSeat: pricePerSeat ?? null,
              paidSeats: paidSeats ?? null,
            },
          });
        } else if (!team.isOrganization && team.teamBilling) {
          await prisma.teamBilling.update({
            where: { id: team.teamBilling.id },
            data: {
              billingPeriod,
              pricePerSeat: pricePerSeat ?? null,
              paidSeats: paidSeats ?? null,
            },
          });
        }

        // Return the backfilled data
        const now = new Date();
        const isInTrial = billing.subscriptionTrialEnd ? new Date(billing.subscriptionTrialEnd) > now : false;

        return {
          billingPeriod,
          subscriptionStart: billing.subscriptionStart,
          subscriptionEnd: billing.subscriptionEnd,
          trialEnd: billing.subscriptionTrialEnd,
          isInTrial,
          pricePerSeat: pricePerSeat ?? null,
          isOrganization: team.isOrganization,
        };
      } catch (error) {
        log.error(`Failed to backfill billing data from Stripe for team ${teamId}`, { error });
        // Fall through to return existing data
      }
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

  /**
   * @deprecated Use getOrCreateBillingPeriodInfo instead. This method will backfill missing data from Stripe.
   */
  async getBillingPeriodInfo(teamId: number): Promise<BillingPeriodInfo> {
    return this.getOrCreateBillingPeriodInfo(teamId);
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
