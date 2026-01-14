import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";

const log = logger.getSubLogger({ prefix: ["PerSeatBillingService"] });

export type ProrationBehavior = "none" | "create_prorations" | "always_invoice";

export interface PerSeatBillingConfig {
  prorationBehavior: ProrationBehavior;
}

export interface UpdateSeatsParams {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  newSeatCount: number;
  config?: PerSeatBillingConfig;
}

export interface SyncSeatsParams {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  config?: PerSeatBillingConfig;
}

export class PerSeatBillingService {
  constructor(private billingProviderService: IBillingProviderService) {}

  async updateSeats(params: UpdateSeatsParams): Promise<void> {
    const { teamId, subscriptionId, subscriptionItemId, newSeatCount, config } = params;

    const prorationBehavior = config?.prorationBehavior ?? "create_prorations";

    log.info(`Updating seats for team ${teamId}: new count = ${newSeatCount}, proration = ${prorationBehavior}`);

    try {
      await this.billingProviderService.handleSubscriptionUpdate({
        subscriptionId,
        subscriptionItemId,
        membershipCount: newSeatCount,
        prorationBehavior,
      });

      log.info(`Successfully updated seats for team ${teamId} to ${newSeatCount}`);
    } catch (error) {
      log.error(`Failed to update seats for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Sync the seat count with the actual membership count.
   * This is useful for reconciliation or when you want to batch seat changes.
   */
  async syncSeatsWithMembership(params: SyncSeatsParams): Promise<{ previousCount: number; newCount: number }> {
    const { teamId, subscriptionId, subscriptionItemId, config } = params;

    const membershipCount = await prisma.membership.count({ where: { teamId } });

    const subscription = await this.billingProviderService.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const subscriptionItem = subscription.items.find((item) => item.id === subscriptionItemId);
    if (!subscriptionItem) {
      throw new Error(`Subscription item ${subscriptionItemId} not found`);
    }

    const currentSeatCount = subscriptionItem.quantity;

    if (currentSeatCount === membershipCount) {
      log.info(`Seats already in sync for team ${teamId}: ${currentSeatCount} seats`);
      return { previousCount: currentSeatCount, newCount: currentSeatCount };
    }

    await this.updateSeats({
      teamId,
      subscriptionId,
      subscriptionItemId,
      newSeatCount: membershipCount,
      config,
    });

    return { previousCount: currentSeatCount, newCount: membershipCount };
  }

  async addSeats(params: {
    teamId: number;
    subscriptionId: string;
    subscriptionItemId: string;
    seatsToAdd: number;
    config?: PerSeatBillingConfig;
  }): Promise<{ previousCount: number; newCount: number }> {
    const { teamId, subscriptionId, subscriptionItemId, seatsToAdd, config } = params;

    const subscription = await this.billingProviderService.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const subscriptionItem = subscription.items.find((item) => item.id === subscriptionItemId);
    if (!subscriptionItem) {
      throw new Error(`Subscription item ${subscriptionItemId} not found`);
    }

    const currentSeatCount = subscriptionItem.quantity;
    const newSeatCount = currentSeatCount + seatsToAdd;

    await this.updateSeats({
      teamId,
      subscriptionId,
      subscriptionItemId,
      newSeatCount,
      config,
    });

    return { previousCount: currentSeatCount, newCount: newSeatCount };
  }

  async removeSeats(params: {
    teamId: number;
    subscriptionId: string;
    subscriptionItemId: string;
    seatsToRemove: number;
    config?: PerSeatBillingConfig;
  }): Promise<{ previousCount: number; newCount: number }> {
    const { teamId, subscriptionId, subscriptionItemId, seatsToRemove, config } = params;

    const subscription = await this.billingProviderService.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const subscriptionItem = subscription.items.find((item) => item.id === subscriptionItemId);
    if (!subscriptionItem) {
      throw new Error(`Subscription item ${subscriptionItemId} not found`);
    }

    const currentSeatCount = subscriptionItem.quantity;
    const newSeatCount = Math.max(1, currentSeatCount - seatsToRemove); // Minimum 1 seat

    await this.updateSeats({
      teamId,
      subscriptionId,
      subscriptionItemId,
      newSeatCount,
      config,
    });

    return { previousCount: currentSeatCount, newCount: newSeatCount };
  }

  static getRecommendedProrationBehavior(billingPeriod: "MONTHLY" | "ANNUALLY"): ProrationBehavior {
    if (billingPeriod === "ANNUALLY") {
      return "always_invoice";
    }
    return "create_prorations";
  }
}
