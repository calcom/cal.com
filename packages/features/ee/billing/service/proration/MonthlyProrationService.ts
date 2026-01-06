import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { ProrationStatus } from "@calcom/prisma/enums";
import type { Logger } from "tslog";

import type { SeatChangeTrackingService } from "../seatTracking/SeatChangeTrackingService";

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

  constructor(customLogger?: Logger<unknown>) {
    this.logger = customLogger || log;
  }

  async processMonthlyProrations(params: ProcessMonthlyProrationsParams) {
    const { monthKey, teamIds } = params;

    const teamsToProcess = teamIds
      ? await this.getTeamsById(teamIds)
      : await this.getAnnualTeamsForMonth(monthKey);

    const results = [];
    for (const team of teamsToProcess) {
      const result = await this.createProrationForTeam({ teamId: team.id, monthKey });
      if (result) results.push(result);
    }

    return results;
  }

  async createProrationForTeam(params: CreateProrationParams) {
    const { teamId, monthKey } = params;

    const { SeatChangeTrackingService } = await import("../seatTracking/SeatChangeTrackingService");
    const seatTracker = new SeatChangeTrackingService();

    const changes = await seatTracker.getMonthlyChanges({ teamId, monthKey });

    if (changes.netChange === 0) {
      return null;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: {
          select: {
            id: true,
            subscriptionId: true,
            subscriptionItemId: true,
            customerId: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            pricePerSeat: true,
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
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!team) throw new Error(`Team ${teamId} not found`);

    const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;
    if (!billing) throw new Error(`No billing record found for team ${teamId}`);
    if (!billing.pricePerSeat) throw new Error(`No price per seat found for team ${teamId}`);
    if (!billing.subscriptionStart || !billing.subscriptionEnd) {
      throw new Error(`Incomplete subscription info for team ${teamId}`);
    }

    const [year, month] = monthKey.split("-").map(Number);
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const calculation = this.calculateProration({
      netSeatIncrease: changes.netChange,
      subscriptionStart: billing.subscriptionStart,
      subscriptionEnd: billing.subscriptionEnd,
      pricePerSeat: billing.pricePerSeat,
      monthEnd: periodEnd,
    });

    const currentSeatCount = team._count.members;

    const proration = await prisma.monthlyProration.create({
      data: {
        teamId,
        monthKey,
        periodStart: new Date(Date.UTC(year, month - 1, 1)),
        periodEnd,
        seatsAtStart: currentSeatCount - changes.netChange,
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
        status: "PENDING" as ProrationStatus,
        teamBillingId: team.isOrganization ? null : billing.id,
        organizationBillingId: team.isOrganization ? billing.id : null,
      },
    });

    await seatTracker.markAsProcessed({ teamId, monthKey, prorationId: proration.id });

    if (calculation.proratedAmount > 0) {
      await this.createStripeInvoiceItem(proration);
    }

    return proration;
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

    const relevantEndDate = subscriptionEndDate < monthEndDate ? subscriptionEndDate : monthEndDate;

    const remainingMs = relevantEndDate.getTime() - monthEndDate.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    const subscriptionStartDate = new Date(subscriptionStart);
    const totalSubscriptionDays = Math.ceil(
      (subscriptionEndDate.getTime() - subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const proratedAmount = (pricePerSeat * netSeatIncrease * remainingDays) / totalSubscriptionDays;

    return {
      proratedAmount: Math.round(proratedAmount * 100) / 100,
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
    const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;

    const amountInCents = Math.round(proration.proratedAmount * 100);

    const invoiceItem = await stripe.invoiceItems.create({
      customer: proration.customerId,
      amount: amountInCents,
      currency: "usd",
      description: `Additional ${proration.netSeatIncrease} seat${proration.netSeatIncrease > 1 ? "s" : ""} for ${proration.monthKey}`,
      metadata: {
        type: "monthly_proration",
        prorationId: proration.id,
        teamId: proration.teamId.toString(),
        monthKey: proration.monthKey,
      },
    });

    await prisma.monthlyProration.update({
      where: { id: proration.id },
      data: {
        invoiceItemId: invoiceItem.id,
        status: "INVOICE_CREATED" as ProrationStatus,
      },
    });

    return invoiceItem;
  }

  async handleProrationPaymentSuccess(prorationId: string) {
    await prisma.monthlyProration.update({
      where: { id: prorationId },
      data: {
        status: "CHARGED" as ProrationStatus,
        chargedAt: new Date(),
      },
    });
  }

  async handleProrationPaymentFailure(params: { prorationId: string; reason: string }) {
    const { prorationId, reason } = params;

    await prisma.monthlyProration.update({
      where: { id: prorationId },
      data: {
        status: "FAILED" as ProrationStatus,
        failedAt: new Date(),
        failureReason: reason,
        retryCount: { increment: 1 },
      },
    });
  }

  async retryFailedProration(prorationId: string) {
    const proration = await prisma.monthlyProration.findUnique({
      where: { id: prorationId },
    });

    if (!proration) throw new Error(`Proration ${prorationId} not found`);
    if (proration.status !== "FAILED") throw new Error(`Proration ${prorationId} is not in FAILED status`);

    await this.createStripeInvoiceItem(proration);
  }

  private async getAnnualTeamsForMonth(monthKey: string) {
    return await prisma.team.findMany({
      where: {
        OR: [
          { teamBilling: { billingPeriod: "ANNUALLY", subscriptionTrialEnd: { lt: new Date() } } },
          { organizationBilling: { billingPeriod: "ANNUALLY", subscriptionTrialEnd: { lt: new Date() } } },
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
  }

  private async getTeamsById(teamIds: number[]) {
    return await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true },
    });
  }
}
