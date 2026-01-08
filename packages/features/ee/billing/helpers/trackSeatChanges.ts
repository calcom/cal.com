import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { SeatChangeTrackingService } from "@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["trackSeatChanges"] });

export function getBillingEntityId(team: {
  id: number;
  isOrganization: boolean;
  parentId: number | null;
}): number {
  if (team.isOrganization) {
    return team.id;
  }

  if (team.parentId) {
    return team.parentId;
  }

  return team.id;
}

export async function trackSeatAdditions(params: {
  billingEntityId: number;
  userIds: number[];
  triggeredBy: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (params.userIds.length === 0) return;

  try {
    const billingPeriodService = new BillingPeriodService();
    const shouldTrack = await billingPeriodService.shouldApplyMonthlyProration(params.billingEntityId);

    if (!shouldTrack) return;

    const seatTracker = new SeatChangeTrackingService();

    for (const userId of params.userIds) {
      await seatTracker.logSeatAddition({
        teamId: params.billingEntityId,
        userId,
        triggeredBy: params.triggeredBy,
        metadata: params.metadata as Record<string, never>,
      });
    }
  } catch (error) {
    log.error("Failed to track seat additions", { error, params });
  }
}

/**
 * Track seat removals for proration billing.
 * Only tracks if monthly proration is enabled for the billing entity.
 *
 * @param params.billingEntityId - The team or org ID to bill against
 * @param params.userIds - Array of user IDs being removed
 * @param params.triggeredBy - User ID who triggered the action (optional for system actions)
 * @param params.metadata - Optional metadata for audit trail
 */
export async function trackSeatRemovals(params: {
  billingEntityId: number;
  userIds: number[];
  triggeredBy?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (params.userIds.length === 0) {
    return;
  }

  try {
    const billingPeriodService = new BillingPeriodService();
    const shouldTrack = await billingPeriodService.shouldApplyMonthlyProration(params.billingEntityId);

    if (!shouldTrack) {
      log.debug(
        `Monthly proration not enabled for billing entity ${params.billingEntityId}, skipping seat tracking`
      );
      return;
    }

    const seatTracker = new SeatChangeTrackingService();

    // Log each seat removal individually
    for (const userId of params.userIds) {
      await seatTracker.logSeatRemoval({
        teamId: params.billingEntityId,
        userId,
        triggeredBy: params.triggeredBy,
        metadata: params.metadata as Record<string, never>,
      });
    }

    log.info(`Tracked ${params.userIds.length} seat removal(s) for billing entity ${params.billingEntityId}`);
  } catch (error) {
    log.error("Failed to track seat removals", { error, params });
    // Don't throw - seat tracking failure shouldn't block the main operation
  }
}
