import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import stripe from "@calcom/features/ee/payments/server/stripe";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import logger from "@calcom/lib/logger";
import type { Logger } from "tslog";
import { buildMonthlyProrationMetadata } from "../../lib/proration-utils";
import { extractBillingDataFromStripeSubscription } from "../../lib/stripe-subscription-utils";
import { updateSubscriptionQuantity } from "../../lib/subscription-updates";
import { MonthlyProrationRepository } from "../../repository/proration/MonthlyProrationRepository";
import type { BillingInfo } from "../../repository/proration/MonthlyProrationTeamRepository";
import { MonthlyProrationTeamRepository } from "../../repository/proration/MonthlyProrationTeamRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import { StripeBillingService } from "../billingProvider/StripeBillingService";
import { SeatChangeTrackingService } from "../seatTracking/SeatChangeTrackingService";

const log = logger.getSubLogger({ prefix: ["MonthlyProrationService"] });

interface ProrationCalculation {
  proratedAmount: number;
  remainingDays: number;
}

interface CreateProrationParams {
  teamId: number;
  monthKey: string;
}

interface ProcessMonthlyProrationsParams {
  monthKey: string;
  teamIds?: number[];
}

export interface MonthlyProrationServiceDeps {
  logger: ISimpleLogger;
  featuresRepository: IFeaturesRepository;
  billingService?: IBillingProviderService;
}

export class MonthlyProrationService {
  private logger: ISimpleLogger;
  private teamRepository: MonthlyProrationTeamRepository;
  private prorationRepository: MonthlyProrationRepository;
  private billingService: IBillingProviderService;
  private featuresRepository: IFeaturesRepository;

  constructor(deps: MonthlyProrationServiceDeps);
  constructor(customLogger?: Logger<unknown>, billingService?: IBillingProviderService);
  constructor(
    depsOrLogger?: MonthlyProrationServiceDeps | Logger<unknown>,
    billingService?: IBillingProviderService
  ) {
    if (depsOrLogger && typeof depsOrLogger === "object" && "logger" in depsOrLogger) {
      this.logger = depsOrLogger.logger;
      this.featuresRepository = depsOrLogger.featuresRepository;
      this.billingService = depsOrLogger.billingService || new StripeBillingService(stripe);
    } else {
      this.logger = (depsOrLogger as Logger<unknown>) || log;
      this.featuresRepository = getFeaturesRepository();
      this.billingService = billingService || new StripeBillingService(stripe);
    }
    this.teamRepository = new MonthlyProrationTeamRepository();
    this.prorationRepository = new MonthlyProrationRepository();
  }

  async processMonthlyProrations(params: ProcessMonthlyProrationsParams) {
    const { monthKey, teamIds } = params;

    const isFeatureEnabled =
      await this.featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");
    if (!isFeatureEnabled) {
      this.logger.info("Monthly proration feature is not enabled, skipping batch processing", { monthKey });
      return [];
    }

    const teamIdsList = teamIds || (await this.teamRepository.getAnnualTeamsWithSeatChanges(monthKey));
    const teamIdsPreview = teamIds && teamIds.length <= 25 ? teamIds : undefined;
    const teamIdsTruncated = teamIds ? teamIds.length > 25 : false;

    this.logger.info("Monthly proration batch started", {
      monthKey,
      teamCount: teamIdsList.length,
      teamIds: teamIdsPreview,
      teamIdsTruncated,
    });

    const teamsToProcess = teamIdsList.map((id: number) => ({ id }));

    const results = [];
    for (const team of teamsToProcess) {
      const result = await this.createProrationForTeam({
        teamId: team.id,
        monthKey,
      });
      if (result) results.push(result);
    }

    this.logger.info("Monthly proration batch finished", {
      monthKey,
      teamCount: teamIdsList.length,
      processedCount: results.length,
      skippedCount: teamIdsList.length - results.length,
    });

    return results;
  }

  async createProrationForTeam(params: CreateProrationParams) {
    const { teamId, monthKey } = params;

    this.logger.info(`[${teamId}] starting monthly proration`, { monthKey });

    const seatTracker = new SeatChangeTrackingService();

    const changes = await seatTracker.getMonthlyChanges({ teamId, monthKey });

    this.logger.info(`[${teamId}] seat changes`, {
      additions: changes.additions,
      removals: changes.removals,
      netChange: changes.netChange,
    });

    // If there are no changes at all (no additions or removals), skip processing
    if (changes.additions === 0 && changes.removals === 0) {
      this.logger.info(`[${teamId}] no seat changes, skipping proration`);
      return null;
    }

    const teamWithBilling = await this.teamRepository.getTeamWithBilling(teamId);

    if (!teamWithBilling) throw new Error(`Team ${teamId} not found`);
    if (!teamWithBilling.billing) {
      throw new Error(`No billing record or metadata found for team ${teamId}`);
    }

    const billing = teamWithBilling.billing;

    if (!billing.billingPeriod || !billing.pricePerSeat) {
      this.logger.info(`[${teamId}] no billing record, checking metadata for subscription info`);
    }

    await this.ensureBillingDataPopulated(teamId, teamWithBilling.isOrganization, billing);

    if (!billing.pricePerSeat) throw new Error(`No price per seat found for team ${teamId}`);
    if (!billing.subscriptionStart || !billing.subscriptionEnd) {
      throw new Error(`Incomplete subscription info for team ${teamId}`);
    }
    if (!billing.subscriptionItemId) {
      throw new Error(`No subscription item ID found for team ${teamId}`);
    }

    const currentSeatCount = teamWithBilling.memberCount;

    const paidSeats = billing.paidSeats ?? (await this.getSubscriptionQuantity(billing.subscriptionId));

    this.logger.info(`[${teamId}] billing summary`, {
      billingPeriod: billing.billingPeriod,
      pricePerSeat: billing.pricePerSeat,
      paidSeats,
    });

    const [year, month] = monthKey.split("-").map(Number);
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const calculation = this.calculateProration({
      netSeatIncrease: changes.netChange,
      subscriptionStart: billing.subscriptionStart,
      subscriptionEnd: billing.subscriptionEnd,
      pricePerSeat: billing.pricePerSeat,
      monthEnd: periodEnd,
    });

    this.logger.info(`[${teamId}] proration calculation`, {
      netSeatIncrease: changes.netChange,
      pricePerSeat: billing.pricePerSeat,
      remainingDays: calculation.remainingDays,
      proratedAmount: calculation.proratedAmount,
    });

    const proration = await this.prorationRepository.createProration({
      teamId,
      monthKey,
      periodStart: new Date(Date.UTC(year, month - 1, 1)),
      periodEnd,
      seatsAtStart: paidSeats,
      seatsAdded: changes.additions,
      seatsRemoved: changes.removals,
      netSeatIncrease: changes.netChange,
      seatsAtEnd: currentSeatCount,
      subscriptionId: billing.subscriptionId,
      subscriptionItemId: billing.subscriptionItemId,
      customerId: billing.customerId,
      subscriptionStart: billing.subscriptionStart,
      subscriptionEnd: billing.subscriptionEnd,
      remainingDays: calculation.remainingDays,
      pricePerSeat: billing.pricePerSeat,
      proratedAmount: calculation.proratedAmount,
      teamBillingId: teamWithBilling.isOrganization ? null : billing.id,
      organizationBillingId: teamWithBilling.isOrganization ? billing.id : null,
    });

    this.logger.info(`[${teamId}] proration record created`, {
      prorationId: proration.id,
      seatsAdded: proration.seatsAdded,
      seatsRemoved: proration.seatsRemoved,
      netSeatIncrease: proration.netSeatIncrease,
      status: proration.status,
    });

    await seatTracker.markAsProcessed({
      teamId,
      monthKey,
      prorationId: proration.id,
    });

    if (calculation.proratedAmount > 0) {
      this.logger.info(`[${teamId}] creating invoice item`, {
        prorationId: proration.id,
        proratedAmount: proration.proratedAmount,
      });
      const updatedProration = await this.createStripeInvoiceItem(proration);
      this.logger.info(`[${teamId}] invoice processed`, {
        prorationId: updatedProration.id,
        status: updatedProration.status,
        invoiceId: updatedProration.invoiceId,
      });
      return updatedProration;
    }

    this.logger.info(`[${teamId}] no charge required, updating subscription quantity`, {
      prorationId: proration.id,
      seatsAtEnd: proration.seatsAtEnd,
    });

    await updateSubscriptionQuantity({
      billingService: this.billingService,
      subscriptionId: proration.subscriptionId,
      subscriptionItemId: proration.subscriptionItemId,
      quantity: proration.seatsAtEnd,
      prorationBehavior: "none",
      logger: this.logger,
    });

    await this.teamRepository.updatePaidSeats(
      teamId,
      teamWithBilling.isOrganization,
      billing.id,
      proration.seatsAtEnd
    );

    const updatedProration = await this.prorationRepository.updateProrationStatus(proration.id, "CHARGED", {
      chargedAt: new Date(),
    });

    this.logger.info(`[${teamId}] subscription updated without charge`, {
      prorationId: updatedProration.id,
      status: updatedProration.status,
      seatsAtEnd: updatedProration.seatsAtEnd,
    });

    return updatedProration;
  }

  private calculateProration(params: {
    netSeatIncrease: number;
    subscriptionStart: Date;
    subscriptionEnd: Date;
    pricePerSeat: number;
    monthEnd: Date;
  }): ProrationCalculation {
    const { netSeatIncrease, subscriptionStart, subscriptionEnd, pricePerSeat, monthEnd } = params;

    const subscriptionEndDate = new Date(subscriptionEnd);
    const monthEndDate = new Date(monthEnd);
    const subscriptionStartDate = new Date(subscriptionStart);

    const remainingMs = subscriptionEndDate.getTime() - monthEndDate.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    const totalSubscriptionDays = Math.ceil(
      (subscriptionEndDate.getTime() - subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const proratedAmount = (pricePerSeat * netSeatIncrease * remainingDays) / totalSubscriptionDays;

    return {
      proratedAmount: Math.round(proratedAmount),
      remainingDays,
    };
  }

  private async createStripeInvoiceItem(proration: {
    id: string;
    customerId: string;
    proratedAmount: number;
    netSeatIncrease: number;
    monthKey: string;
    teamId: number;
    subscriptionId: string;
    remainingDays: number;
    invoiceId?: string | null;
  }) {
    const amountInCents = Math.round(proration.proratedAmount);

    const hasDefaultPaymentMethod = await this.billingService.hasDefaultPaymentMethod({
      customerId: proration.customerId,
      subscriptionId: proration.subscriptionId,
    });

    const { invoiceItemId } = await this.billingService.createInvoiceItem({
      customerId: proration.customerId,
      amount: amountInCents,
      currency: "usd",
      description: `Additional ${proration.netSeatIncrease} seat${
        proration.netSeatIncrease > 1 ? "s" : ""
      } for ${proration.monthKey} (${proration.remainingDays} days remaining)`,
      subscriptionId: proration.subscriptionId,
      metadata: buildMonthlyProrationMetadata({
        prorationId: proration.id,
        teamId: proration.teamId,
        monthKey: proration.monthKey,
      }),
    });

    let invoiceId: string | null = null;
    let invoiceFinalized = false;
    let invoiceUrl: string | null = null;

    try {
      const invoice = await this.billingService.createInvoice({
        customerId: proration.customerId,
        autoAdvance: true,
        collectionMethod: hasDefaultPaymentMethod ? "charge_automatically" : "send_invoice",
        subscriptionId: proration.subscriptionId,
        metadata: buildMonthlyProrationMetadata({ prorationId: proration.id }),
      });

      invoiceId = invoice.invoiceId;

      const finalizedInvoice = await this.billingService.finalizeInvoice(invoiceId);
      invoiceFinalized = true;
      invoiceUrl = finalizedInvoice.invoiceUrl;

      return await this.prorationRepository.updateProrationStatus(
        proration.id,
        hasDefaultPaymentMethod ? "INVOICE_CREATED" : "PENDING",
        {
          invoiceItemId,
          invoiceId,
          invoiceUrl: invoiceUrl ?? undefined,
        }
      );
    } catch (error) {
      await this.handleInvoiceCreationFailure({
        error,
        prorationId: proration.id,
        invoiceId,
        invoiceItemId,
        invoiceFinalized,
      });
      throw error;
    }
  }

  private async handleInvoiceCreationFailure(params: {
    error: unknown;
    prorationId: string;
    invoiceId: string | null;
    invoiceItemId: string;
    invoiceFinalized: boolean;
  }) {
    const { error, prorationId, invoiceId, invoiceItemId, invoiceFinalized } = params;

    if (invoiceFinalized) {
      // Invoice is live and potentially being charged - don't clean up
      // The webhook will handle payment success/failure
      this.logger.error("Proration status update failed after invoice finalized - webhook will handle", {
        prorationId,
        invoiceId,
        error,
      });
      return;
    }

    // Invoice not yet live - mark as FAILED to enable retry via retryFailedProration()
    const failureReason = error instanceof Error ? error.message : "Invoice creation failed";
    try {
      await this.prorationRepository.updateProrationStatus(prorationId, "FAILED", {
        failedAt: new Date(),
        failureReason,
      });
    } catch (statusError) {
      this.logger.error("Failed to update proration status to FAILED", { prorationId, error: statusError });
    }

    // Clean up Stripe artifacts
    try {
      if (invoiceId) {
        await this.billingService.voidInvoice(invoiceId);
      } else {
        await this.billingService.deleteInvoiceItem(invoiceItemId);
      }
    } catch (cleanupError) {
      this.logger.error("Failed to clean up Stripe artifacts", {
        prorationId,
        invoiceId,
        invoiceItemId,
        error: cleanupError,
      });
    }
  }

  async handleProrationPaymentSuccess(prorationId: string) {
    const proration = await this.prorationRepository.findById(prorationId);
    if (!proration) {
      throw new Error(`Proration ${prorationId} not found`);
    }

    await this.prorationRepository.updateProrationStatus(prorationId, "CHARGED", {
      chargedAt: new Date(),
    });

    // Use the seat count that was captured when the proration was created.
    // Any member changes after proration creation will be captured in the next month's cycle.
    const seatsToApply = proration.seatsAtEnd;

    await updateSubscriptionQuantity({
      billingService: this.billingService,
      subscriptionId: proration.subscriptionId,
      subscriptionItemId: proration.subscriptionItemId,
      quantity: seatsToApply,
      prorationBehavior: "none",
      logger: this.logger,
    });

    const billingId = proration.teamBillingId || proration.organizationBillingId;
    if (billingId) {
      const isOrganization = !!proration.organizationBillingId;
      await this.teamRepository.updatePaidSeats(proration.teamId, isOrganization, billingId, seatsToApply);
    }
  }

  async handleProrationPaymentFailure(params: { prorationId: string; reason: string }) {
    const { prorationId, reason } = params;

    const proration = await this.prorationRepository.findById(prorationId);
    if (!proration) throw new Error(`Proration ${prorationId} not found`);

    await this.prorationRepository.updateProrationStatus(prorationId, "FAILED", {
      failedAt: new Date(),
      failureReason: reason,
      retryCount: (proration.retryCount || 0) + 1,
    });
  }

  async retryFailedProration(prorationId: string) {
    const proration = await this.prorationRepository.findById(prorationId);

    if (!proration) throw new Error(`Proration ${prorationId} not found`);
    if (proration.status !== "FAILED") throw new Error(`Proration ${prorationId} is not in FAILED status`);

    // Void the old invoice to prevent double charging
    if (proration.invoiceId) {
      await this.billingService.voidInvoice(proration.invoiceId);
    }

    await this.createStripeInvoiceItem(proration);
  }

  private async ensureBillingDataPopulated(teamId: number, isOrganization: boolean, billing: BillingInfo) {
    const needsCreation = !billing.id || billing.id === "";

    if (
      !needsCreation &&
      billing.billingPeriod &&
      billing.pricePerSeat &&
      billing.subscriptionStart &&
      billing.subscriptionEnd
    ) {
      return;
    }

    this.logger.info(`[${teamId}] ${needsCreation ? "creating" : "populating"} billing data from stripe`);

    try {
      const subscription = await this.billingService.getSubscription(billing.subscriptionId);

      if (!subscription) {
        throw new Error(`Subscription ${billing.subscriptionId} not found`);
      }

      const {
        billingPeriod,
        pricePerSeat: rawPricePerSeat,
        paidSeats: rawPaidSeats,
        subscriptionStart,
        subscriptionEnd,
        subscriptionTrialEnd,
      } = extractBillingDataFromStripeSubscription(subscription);

      const pricePerSeat = rawPricePerSeat ?? 0;
      const paidSeats = rawPaidSeats ?? 0;
      const subscriptionItemId = subscription.items[0]?.id || billing.subscriptionItemId || "";
      const customerId = subscription.customer;

      if (needsCreation) {
        const billingData = {
          teamId,
          subscriptionId: billing.subscriptionId,
          subscriptionItemId,
          customerId,
          status: subscription.status.toUpperCase(),
          planName: isOrganization ? "ORGANIZATION" : "TEAM",
          billingPeriod,
          pricePerSeat,
          paidSeats,
          subscriptionStart: subscriptionStart ?? null,
          subscriptionEnd: subscriptionEnd ?? null,
          subscriptionTrialEnd: subscriptionTrialEnd ?? null,
        };

        const createdBilling = isOrganization
          ? await this.teamRepository.createOrganizationBilling(billingData)
          : await this.teamRepository.createTeamBilling(billingData);

        billing.id = createdBilling.id;
        billing.customerId = customerId;
        billing.subscriptionItemId = subscriptionItemId;
        billing.paidSeats = paidSeats;
      } else {
        await this.teamRepository.updateBillingInfo(teamId, isOrganization, billing.id, {
          billingPeriod,
          pricePerSeat,
          ...(subscriptionStart && { subscriptionStart }),
          ...(subscriptionEnd && { subscriptionEnd }),
        });
      }

      this.logger.info(
        `[${teamId}] ${needsCreation ? "created" : "populated"}: ${billingPeriod}, ${pricePerSeat} cents/seat`
      );

      billing.billingPeriod = billingPeriod;
      billing.pricePerSeat = pricePerSeat;
      billing.subscriptionStart = subscriptionStart ?? null;
      billing.subscriptionEnd = subscriptionEnd ?? null;
      billing.subscriptionItemId = subscriptionItemId;
      if (needsCreation) {
        billing.customerId = customerId;
      }
    } catch (error) {
      this.logger.error(
        `[${teamId}] failed to ${needsCreation ? "create" : "populate"} billing data:`,
        error
      );
      throw error;
    }
  }

  private async getSubscriptionQuantity(subscriptionId: string): Promise<number> {
    const subscription = await this.billingService.getSubscription(subscriptionId);
    return subscription?.items[0]?.quantity || 0;
  }
}
