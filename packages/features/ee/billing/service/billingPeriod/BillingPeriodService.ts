import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
import { BillingPeriodRepository } from "@calcom/features/ee/billing/repository/billingPeriod/BillingPeriodRepository";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import stripe from "@calcom/features/ee/payments/server/stripe";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { BillingMode, BillingPeriod } from "@calcom/prisma/enums";
import type { Logger } from "tslog";

const log = logger.getSubLogger({ prefix: ["BillingPeriodService"] });

export interface BillingPeriodInfo {
  billingPeriod: BillingPeriod | null;
  billingMode: BillingMode | null;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  trialEnd: Date | null;
  isInTrial: boolean;
  pricePerSeat: number | null;
  isOrganization: boolean;
}

export interface BillingPeriodServiceDeps {
  logger?: Logger<unknown>;
  repository?: BillingPeriodRepository;
  featuresRepository?: IFeaturesRepository;
}

export class BillingPeriodService {
  private logger: Logger<unknown>;
  private repository: BillingPeriodRepository;
  private featuresRepository: IFeaturesRepository;

  constructor(deps?: BillingPeriodServiceDeps) {
    this.logger = deps?.logger || log;
    this.repository = deps?.repository || new BillingPeriodRepository();
    this.featuresRepository = deps?.featuresRepository || getFeaturesRepository();
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
      const isEnabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");
      if (!isEnabled) {
        return false;
      }

      const info = await this.getOrCreateBillingPeriodInfo(teamId);

      return info.billingPeriod === "ANNUALLY" && !info.isInTrial && info.subscriptionStart !== null;
    } catch (error) {
      log.error(`Failed to check if monthly proration should apply for team ${teamId}`, { error });
      return false;
    }
  }

  async shouldApplyHighWaterMark(teamId: number): Promise<boolean> {
    try {
      const isEnabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("hwm-seating");
      if (!isEnabled) {
        return false;
      }

      const info = await this.getOrCreateBillingPeriodInfo(teamId);

      return info.billingPeriod === "MONTHLY" && !info.isInTrial && info.subscriptionStart !== null;
    } catch (error) {
      log.error(`Failed to check if high water mark should apply for team ${teamId}`, { error });
      return false;
    }
  }

  async isMonthlyBilling(teamId: number): Promise<boolean> {
    const info = await this.getOrCreateBillingPeriodInfo(teamId);
    return info.billingPeriod === "MONTHLY";
  }

  async getOrCreateBillingPeriodInfo(teamId: number): Promise<BillingPeriodInfo> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: {
          select: {
            id: true,
            billingPeriod: true,
            billingMode: true,
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
            billingMode: true,
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

    const isOrganization = team.isOrganization;
    const billing = isOrganization ? team.organizationBilling : team.teamBilling;

    if (!billing) {
      return {
        billingPeriod: null,
        billingMode: null,
        subscriptionStart: null,
        subscriptionEnd: null,
        trialEnd: null,
        isInTrial: false,
        pricePerSeat: null,
        isOrganization,
      };
    }

    const periodIsStale =
      billing.subscriptionEnd && new Date(billing.subscriptionEnd) < new Date();
    const needsSync = (!billing.billingPeriod || periodIsStale) && billing.subscriptionId;

    if (needsSync) {
      log.info(
        `Syncing billing data for team ${teamId} from Stripe subscription ${billing.subscriptionId}`
      );

      try {
        const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);

        const terminalStatuses = ["canceled", "incomplete_expired"];
        if (terminalStatuses.includes(subscription.status)) {
          log.info(
            `Skipping sync for team ${teamId} — subscription ${billing.subscriptionId} has status "${subscription.status}"`
          );
          const now = new Date();
          const isInTrial = billing.subscriptionTrialEnd
            ? new Date(billing.subscriptionTrialEnd) > now
            : false;

          return {
            billingPeriod: billing.billingPeriod,
            billingMode: billing.billingMode,
            subscriptionStart: billing.subscriptionStart,
            subscriptionEnd: billing.subscriptionEnd,
            trialEnd: billing.subscriptionTrialEnd,
            isInTrial,
            pricePerSeat: billing.pricePerSeat,
            isOrganization,
          };
        }

        const { billingPeriod, pricePerSeat, paidSeats, subscriptionStart, subscriptionEnd } =
          extractBillingDataFromStripeSubscription(subscription);

        const updateData = {
          billingPeriod,
          pricePerSeat: pricePerSeat ?? null,
          paidSeats: paidSeats ?? null,
          subscriptionStart: subscriptionStart ?? null,
          subscriptionEnd: subscriptionEnd ?? null,
        };

        if (isOrganization) {
          await this.repository.updateOrganizationBillingPeriod(billing.id, updateData);
        } else {
          await this.repository.updateTeamBillingPeriod(billing.id, updateData);
        }

        const now = new Date();
        const isInTrial = billing.subscriptionTrialEnd ? new Date(billing.subscriptionTrialEnd) > now : false;

        return {
          billingPeriod,
          billingMode: billing.billingMode,
          subscriptionStart: subscriptionStart ?? null,
          subscriptionEnd: subscriptionEnd ?? null,
          trialEnd: billing.subscriptionTrialEnd,
          isInTrial,
          pricePerSeat: pricePerSeat ?? null,
          isOrganization,
        };
      } catch (error) {
        log.error(`Failed to backfill billing data from Stripe for team ${teamId}`, { error });
      }
    }

    const now = new Date();
    const isInTrial = billing.subscriptionTrialEnd ? new Date(billing.subscriptionTrialEnd) > now : false;

    return {
      billingPeriod: billing.billingPeriod,
      billingMode: billing.billingMode,
      subscriptionStart: billing.subscriptionStart,
      subscriptionEnd: billing.subscriptionEnd,
      trialEnd: billing.subscriptionTrialEnd,
      isInTrial,
      pricePerSeat: billing.pricePerSeat,
      isOrganization,
    };
  }

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
