import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import type { Logger } from "tslog";
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

export class MonthlyProrationService {
  private logger: Logger<unknown>;
  private teamRepository: MonthlyProrationTeamRepository;
  private prorationRepository: MonthlyProrationRepository;
  private billingService: IBillingProviderService;

  constructor(customLogger?: Logger<unknown>, billingService?: IBillingProviderService) {
    this.logger = customLogger || log;
    this.teamRepository = new MonthlyProrationTeamRepository();
    this.prorationRepository = new MonthlyProrationRepository();
    this.billingService = billingService || new StripeBillingService(stripe);
  }

  async processMonthlyProrations(params: ProcessMonthlyProrationsParams) {
    const { monthKey, teamIds } = params;

    const teamIdsList = teamIds || (await this.teamRepository.getAnnualTeamsWithSeatChanges(monthKey));

    const teamsToProcess = teamIdsList.map((id: number) => ({ id }));

    const results = [];
    for (const team of teamsToProcess) {
      const result = await this.createProrationForTeam({
        teamId: team.id,
        monthKey,
      });
      if (result) results.push(result);
    }

    return results;
  }

  async createProrationForTeam(params: CreateProrationParams) {
    const { teamId, monthKey } = params;

    const seatTracker = new SeatChangeTrackingService();

    const changes = await seatTracker.getMonthlyChanges({ teamId, monthKey });

    // If there are no changes at all (no additions or removals), skip processing
    if (changes.additions === 0 && changes.removals === 0) {
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

    const [year, month] = monthKey.split("-").map(Number);
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const calculation = this.calculateProration({
      netSeatIncrease: changes.netChange,
      subscriptionStart: billing.subscriptionStart,
      subscriptionEnd: billing.subscriptionEnd,
      pricePerSeat: billing.pricePerSeat,
      monthEnd: periodEnd,
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

    await seatTracker.markAsProcessed({
      teamId,
      monthKey,
      prorationId: proration.id,
    });

    if (calculation.proratedAmount > 0) {
      const updatedProration = await this.createStripeInvoiceItem(proration);
      return updatedProration;
    }

    await this.updateSubscriptionQuantity(
      proration.subscriptionId,
      proration.subscriptionItemId,
      proration.seatsAtEnd
    );

    await this.teamRepository.updatePaidSeats(
      teamId,
      teamWithBilling.isOrganization,
      billing.id,
      proration.seatsAtEnd
    );

    return await this.prorationRepository.updateProrationStatus(proration.id, "CHARGED", {
      chargedAt: new Date(),
    });
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
  }) {
    const amountInCents = Math.round(proration.proratedAmount);

    const { invoiceItemId } = await this.billingService.createInvoiceItem({
      customerId: proration.customerId,
      amount: amountInCents,
      currency: "usd",
      description: `Additional ${proration.netSeatIncrease} seat${
        proration.netSeatIncrease > 1 ? "s" : ""
      } for ${proration.monthKey}`,
      metadata: {
        type: "monthly_proration",
        prorationId: proration.id,
        teamId: proration.teamId.toString(),
        monthKey: proration.monthKey,
      },
    });

    const { invoiceId } = await this.billingService.createInvoice({
      customerId: proration.customerId,
      autoAdvance: true,
      metadata: {
        type: "monthly_proration",
        prorationId: proration.id,
      },
    });

    await this.billingService.finalizeInvoice(invoiceId);

    const updatedProration = await this.prorationRepository.updateProrationStatus(
      proration.id,
      "INVOICE_CREATED",
      {
        invoiceItemId,
        invoiceId,
      }
    );

    return updatedProration;
  }

  async handleProrationPaymentSuccess(prorationId: string) {
    const proration = await this.prorationRepository.findById(prorationId);
    if (!proration) {
      throw new Error(`Proration ${prorationId} not found`);
    }

    await this.prorationRepository.updateProrationStatus(prorationId, "CHARGED", {
      chargedAt: new Date(),
    });

    await this.updateSubscriptionQuantity(
      proration.subscriptionId,
      proration.subscriptionItemId,
      proration.seatsAtEnd
    );

    const billingId = proration.teamBillingId || proration.organizationBillingId;
    if (billingId) {
      const isOrganization = !!proration.organizationBillingId;
      await this.teamRepository.updatePaidSeats(
        proration.teamId,
        isOrganization,
        billingId,
        proration.seatsAtEnd
      );
    }
  }

  private async updateSubscriptionQuantity(
    subscriptionId: string,
    subscriptionItemId: string,
    quantity: number
  ): Promise<void> {
    try {
      await this.billingService.handleSubscriptionUpdate({
        subscriptionId,
        subscriptionItemId,
        membershipCount: quantity,
      });
    } catch (error) {
      this.logger.error(`Failed to update subscription ${subscriptionId} quantity to ${quantity}:`, error);
      throw error;
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

      const billingPeriod: "ANNUALLY" | "MONTHLY" =
        subscription.items[0]?.price.recurring?.interval === "year" ? "ANNUALLY" : "MONTHLY";

      const pricePerSeat = subscription.items[0]?.price.unit_amount ?? 0;

      const subscriptionStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null;

      const subscriptionEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;

      const subscriptionItemId = subscription.items[0]?.id || billing.subscriptionItemId || "";
      const customerId = subscription.customer;
      const subscriptionTrialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

      if (needsCreation) {
        const paidSeats = subscription.items[0]?.quantity || 0;
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
          subscriptionStart,
          subscriptionEnd,
          subscriptionTrialEnd,
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
      billing.subscriptionStart = subscriptionStart;
      billing.subscriptionEnd = subscriptionEnd;
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
