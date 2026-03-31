import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { BillingMode } from "@calcom/prisma/enums";

import type { AdminBillingRepository } from "../../repository/adminBilling/AdminBillingRepository";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";

const log = logger.getSubLogger({ prefix: ["AdminBillingModeService"] });

export type UpdateBillingModeInput = {
  billingId: string;
  entityType: "team" | "organization";
  billingMode: BillingMode;
  minSeats: number | null;
  pricePerSeat: number | null;
};

export class AdminBillingModeService {
  constructor(
    private readonly adminBillingRepository: AdminBillingRepository,
    private readonly billingProviderService: IBillingProviderService
  ) {}

  async updateBillingMode(input: UpdateBillingModeInput): Promise<{ success: true }> {
    const { billingId, entityType, billingMode, minSeats, pricePerSeat } = input;
    const isOrg = entityType === "organization";

    const billingRecord = isOrg
      ? await this.adminBillingRepository.findOrgBillingForModeUpdate(billingId)
      : await this.adminBillingRepository.findTeamBillingForModeUpdate(billingId);

    if (!billingRecord) {
      throw ErrorWithCode.Factory.NotFound(`Billing record ${billingId} not found for ${entityType}`);
    }

    const needsStripeUpdate =
      billingMode === "ACTIVE_USERS" && pricePerSeat !== null && pricePerSeat !== billingRecord.pricePerSeat;

    const data = {
      billingMode,
      minSeats: billingMode === "ACTIVE_USERS" ? minSeats : null,
      ...(billingMode === "ACTIVE_USERS" && pricePerSeat !== null ? { pricePerSeat } : {}),
    };

    // Update DB first so retries don't create duplicate Stripe prices
    if (isOrg) {
      await this.adminBillingRepository.updateOrgBillingMode(billingId, data);
    } else {
      await this.adminBillingRepository.updateTeamBillingMode(billingId, data);
    }

    if (needsStripeUpdate) {
      try {
        await this.updateStripePrice({
          entityType,
          billingRecord,
          pricePerSeat,
        });
      } catch (error) {
        // Roll back DB to previous values so the operation can be retried
        const rollbackData = {
          billingMode: billingRecord.billingMode,
          minSeats: billingRecord.minSeats,
          pricePerSeat: billingRecord.pricePerSeat ?? undefined,
        };
        log.error("Stripe price update failed, rolling back DB", {
          billingId,
          entityType,
          error,
        });
        if (isOrg) {
          await this.adminBillingRepository.updateOrgBillingMode(billingId, rollbackData);
        } else {
          await this.adminBillingRepository.updateTeamBillingMode(billingId, rollbackData);
        }
        throw error;
      }
    }

    log.info("Billing mode updated", {
      billingId,
      entityType,
      teamId: billingRecord.teamId,
      billingMode,
      minSeats: data.minSeats,
      pricePerSeat: pricePerSeat ?? billingRecord.pricePerSeat,
    });

    return { success: true };
  }

  private async updateStripePrice({
    entityType,
    billingRecord,
    pricePerSeat,
  }: {
    entityType: "team" | "organization";
    billingRecord: {
      subscriptionId: string;
      subscriptionItemId: string;
      billingPeriod: string | null;
      teamId: number;
    };
    pricePerSeat: number;
  }): Promise<void> {
    const productIdEnvVar = entityType === "organization" ? "STRIPE_ORG_PRODUCT_ID" : "STRIPE_TEAM_PRODUCT_ID";
    const productId = process.env[productIdEnvVar];
    if (!productId) {
      throw ErrorWithCode.Factory.InternalServerError(`${productIdEnvVar} is not set`);
    }

    if (!billingRecord.billingPeriod) {
      throw ErrorWithCode.Factory.BadRequest("Billing period is required for Stripe price update");
    }
    const interval = billingRecord.billingPeriod === "ANNUALLY" ? ("year" as const) : ("month" as const);
    const occurrence = interval === "year" ? 12 : 1;

    const newPrice = await this.billingProviderService.createPrice({
      amount: pricePerSeat * occurrence,
      productId,
      currency: "usd",
      interval,
      nickname: `Admin override - ${pricePerSeat} cents/seat (${entityType} ${billingRecord.teamId})`,

      metadata: {
        adminOverride: "true",
        teamId: String(billingRecord.teamId),
        updatedAt: new Date().toISOString(),
      },

    });

    await this.billingProviderService.updateSubscriptionPrice({
      subscriptionId: billingRecord.subscriptionId,
      subscriptionItemId: billingRecord.subscriptionItemId,
      newPriceId: newPrice.priceId,
      prorationBehavior: "none",
    });

    log.info("Stripe price updated", {
      entityType,
      teamId: billingRecord.teamId,
      subscriptionId: billingRecord.subscriptionId,
      newPriceId: newPrice.priceId,
      pricePerSeat,
    });
  }
}
