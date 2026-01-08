import { BillingPeriodRepository } from "@calcom/features/ee/billing/repository/billingPeriod/BillingPeriodRepository";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
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
  private logger: Logger<unknown>;
  private repository: BillingPeriodRepository;

  constructor(customLogger?: Logger<unknown>, repository?: BillingPeriodRepository) {
    this.logger = customLogger || log;
    this.repository = repository || new BillingPeriodRepository();
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

      console.log({
        billingPeriod: info.billingPeriod,
        isInTrial: info.isInTrial,
        subscriptionStart: info.subscriptionStart,
        trialEnd: info.trialEnd,
        shouldApplyMonthlyProration:
          info.billingPeriod === "ANNUALLY" && !info.isInTrial && info.subscriptionStart !== null,
      });

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
        isOrganization,
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
        if (isOrganization) {
          await this.repository.updateOrganizationBillingPeriod(billing.id, {
            billingPeriod,
            pricePerSeat: pricePerSeat ?? null,
            paidSeats: paidSeats ?? null,
          });
        } else {
          await this.repository.updateTeamBillingPeriod(billing.id, {
            billingPeriod,
            pricePerSeat: pricePerSeat ?? null,
            paidSeats: paidSeats ?? null,
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
          isOrganization,
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
      isOrganization,
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

    const team = await this.repository.getTeamForBillingUpdate(teamId);

    if (!team) throw new Error(`Team ${teamId} not found`);

    if (team.isOrganization && team.organizationBilling) {
      await this.repository.updateOrganizationBillingPeriod(team.organizationBilling.id, {
        billingPeriod,
        pricePerSeat,
      });
    } else if (!team.isOrganization && team.teamBilling) {
      await this.repository.updateTeamBillingPeriod(team.teamBilling.id, {
        billingPeriod,
        pricePerSeat,
      });
    } else {
      throw new Error(`No billing record found for team ${teamId}`);
    }
  }
}
