import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { BillingPeriodPricing } from "@calcom/features/ee/billing/domain/BillingPeriodPricing";
import { BillingPeriodSwitch, BillingPeriodSwitchError } from "@calcom/features/ee/billing/domain/BillingPeriodSwitch";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import { BillingPeriodRepository } from "@calcom/features/ee/billing/repository/billingPeriod/BillingPeriodRepository";
import type { IBillingProviderService } from "@calcom/features/ee/billing/service/billingProvider/IBillingProviderService";
import stripe from "@calcom/features/ee/payments/server/stripe";
import type { IFeatureRepository } from "@calcom/features/flags/repositories/PrismaFeatureRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
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
  minSeats: number | null;
  isOrganization: boolean;
}

export interface BillingPeriodServiceDeps {
  logger?: Logger<unknown>;
  repository?: BillingPeriodRepository;
  featuresRepository?: IFeatureRepository;
  billingProviderService?: IBillingProviderService;
}

export class BillingPeriodService {
  private logger: Logger<unknown>;
  private repository: BillingPeriodRepository;
  private featuresRepository: IFeatureRepository;
  private billingProviderService: IBillingProviderService | null;

  constructor(deps?: BillingPeriodServiceDeps) {
    this.logger = deps?.logger || log;
    this.repository = deps?.repository || new BillingPeriodRepository();
    this.featuresRepository = deps?.featuresRepository || getFeatureRepository();
    this.billingProviderService = deps?.billingProviderService ?? null;
  }

  private async getBillingProviderService(): Promise<IBillingProviderService> {
    if (this.billingProviderService) return this.billingProviderService;
    const { getBillingProviderService } = await import("@calcom/features/ee/billing/di/containers/Billing");
    this.billingProviderService = getBillingProviderService();
    return this.billingProviderService;
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
            minSeats: true,
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
            minSeats: true,
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
        minSeats: null,
        isOrganization,
      };
    }

    const periodIsStale = billing.subscriptionEnd && new Date(billing.subscriptionEnd) < new Date();
    const needsSync = (!billing.billingPeriod || periodIsStale) && billing.subscriptionId;

    if (needsSync) {
      log.info(`Syncing billing data for team ${teamId} from Stripe subscription ${billing.subscriptionId}`);

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
            minSeats: billing.minSeats,
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
          minSeats: billing.minSeats,
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
      minSeats: billing.minSeats,
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

  async canSwitchToMonthly(teamId: number): Promise<{ allowed: boolean; switchDate?: Date }> {
    const teamData = await this.repository.getTeamWithBillingInfo(teamId);
    if (!teamData?.billing) return { allowed: false };

    const domainSwitch = new BillingPeriodSwitch({
      billingPeriod: teamData.billing.billingPeriod,
      subscriptionId: teamData.billing.subscriptionId,
      subscriptionEnd: teamData.billing.subscriptionEnd,
    });

    const eligibility = domainSwitch.canSwitchTo("MONTHLY");
    return { allowed: eligibility.allowed, switchDate: eligibility.switchDate };
  }

  async switchBillingPeriod(
    teamId: number,
    targetPeriod: "MONTHLY" | "ANNUALLY"
  ): Promise<{ newPeriod: BillingPeriod; newPricePerSeat: number; effectiveDate?: Date }> {
    const teamData = await this.repository.getTeamWithBillingInfo(teamId);
    if (!teamData?.billing) {
      throw ErrorWithCode.Factory.NotFound(`No billing record found for team ${teamId}`);
    }

    const { billing, isOrganization } = teamData;

    const domainSwitch = new BillingPeriodSwitch({
      billingPeriod: billing.billingPeriod,
      subscriptionId: billing.subscriptionId,
      subscriptionEnd: billing.subscriptionEnd,
    });

    let plan;
    try {
      plan = domainSwitch.planSwitchTo(targetPeriod);
    } catch (error) {
      if (error instanceof BillingPeriodSwitchError) {
        throw ErrorWithCode.Factory.BadRequest(error.message);
      }
      throw error;
    }

    const pricing = new BillingPeriodPricing();
    const { priceId, pricePerSeat } = pricing.resolve(targetPeriod, isOrganization);

    if (!priceId) {
      throw ErrorWithCode.Factory.BadRequest(
        `No price ID configured for ${targetPeriod} ${isOrganization ? "organization" : "team"} billing`
      );
    }

    const billingProvider = await this.getBillingProviderService();

    const isInTrial =
      billing.subscriptionTrialEnd != null && new Date(billing.subscriptionTrialEnd) > new Date();

    if (isInTrial) {
      this.logger.info(`Ending trial for team ${teamId} before switching billing period`);
    }

    await billingProvider.updateSubscriptionPrice({
      subscriptionId: billing.subscriptionId,
      subscriptionItemId: billing.subscriptionItemId,
      newPriceId: priceId,
      prorationBehavior: plan.prorationBehavior,
      endTrial: isInTrial,
    });

    if (isOrganization) {
      await this.repository.updateOrganizationBillingPeriod(billing.id, {
        billingPeriod: targetPeriod,
        pricePerSeat,
      });
    } else {
      await this.repository.updateTeamBillingPeriod(billing.id, {
        billingPeriod: targetPeriod,
        pricePerSeat,
      });
    }

    return {
      newPeriod: targetPeriod,
      newPricePerSeat: pricePerSeat,
      effectiveDate: plan.effectiveDate,
    };
  }
}
