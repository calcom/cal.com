import type { PrismaClient } from "@calcom/prisma";
import dayjs from "@calcom/dayjs";

export interface HostLimitConfig {
  userId: number;
  eventTypeId: number;
  limit: number | null;
  window: "day" | "week" | "month" | null;
}

export interface EffectiveLimitsResult {
  userId: number;
  currentCount: number;
  limit: number | null;
  window: string | null;
  isWithinLimit: boolean;
  remainingSlots: number | null;
}

/**
 * Service for managing round-robin host effective limits
 * This is the foundation for per-member round-robin limit settings
 */
export class RoundRobinHostLimitsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get effective limits for hosts in an event type
   * This is a foundation method that prepares the structure for limit checks
   * without changing current booking behavior
   */
  async getEffectiveLimits({
    eventTypeId,
    hostIds,
    limitConfig,
  }: {
    eventTypeId: number;
    hostIds: number[];
    limitConfig?: Map<number, { limit: number | null; window: "day" | "week" | "month" | null }>;
  }): Promise<EffectiveLimitsResult[]> {
    const results: EffectiveLimitsResult[] = [];

    for (const userId of hostIds) {
      const config = limitConfig?.get(userId);
      const limit = config?.limit ?? null;
      const window = config?.window ?? null;

      // If no limit is set, host has unlimited capacity
      if (!limit || !window) {
        results.push({
          userId,
          currentCount: 0,
          limit: null,
          window: null,
          isWithinLimit: true,
          remainingSlots: null,
        });
        continue;
      }

      // Calculate window boundaries
      const now = dayjs();
      let windowStart: Date;

      switch (window) {
        case "day":
          windowStart = now.startOf("day").toDate();
          break;
        case "week":
          windowStart = now.startOf("week").toDate();
          break;
        case "month":
          windowStart = now.startOf("month").toDate();
          break;
        default:
          windowStart = now.startOf("day").toDate();
      }

      // Count bookings for this host in the current window
      const currentCount = await this.prisma.booking.count({
        where: {
          userId,
          eventTypeId,
          createdAt: {
            gte: windowStart,
          },
          status: {
            notIn: ["CANCELLED"],
          },
        },
      });

      results.push({
        userId,
        currentCount,
        limit,
        window,
        isWithinLimit: currentCount < limit,
        remainingSlots: Math.max(0, limit - currentCount),
      });
    }

    return results;
  }

  /**
   * Filter hosts by effective limits
   * Returns only hosts that are within their booking limits
   * This is a foundation method - currently allows all hosts (no limit enforcement)
   * but provides the structure for future limit enforcement
   */
  async filterHostsByLimits({
    eventTypeId,
    hosts,
    limitConfig,
  }: {
    eventTypeId: number;
    hosts: { userId: number; isFixed: boolean }[];
    limitConfig?: Map<number, { limit: number | null; window: "day" | "week" | "month" | null }>;
  }): Promise<{ userId: number; isFixed: boolean }[]> {
    // For now, return all hosts (no limit enforcement)
    // This is the foundation - limits will be enforced in a future iteration
    const hostIds = hosts.filter((h) => !h.isFixed).map((h) => h.userId);

    if (hostIds.length === 0 || !limitConfig) {
      return hosts;
    }

    const effectiveLimits = await this.getEffectiveLimits({
      eventTypeId,
      hostIds,
      limitConfig,
    });

    // Create a map of userId to limit status
    const limitStatusMap = new Map(
      effectiveLimits.map((r) => [
        r.userId,
        {
          isWithinLimit: r.isWithinLimit,
          remainingSlots: r.remainingSlots,
        },
      ])
    );

    // Filter hosts - for now we keep all hosts but the structure is ready
    // In the future, this will filter out hosts that have exceeded their limits
    return hosts.filter((host) => {
      if (host.isFixed) return true; // Fixed hosts are not affected by RR limits

      const status = limitStatusMap.get(host.userId);
      if (!status) return true;

      // Foundation: Currently allows all hosts
      // TODO: In future PR, change to: return status.isWithinLimit;
      return true;
    });
  }

  /**
   * Get limit status for a specific host
   * Useful for UI indicators showing how many bookings a host has left
   */
  async getHostLimitStatus({
    userId,
    eventTypeId,
    limit,
    window,
  }: {
    userId: number;
    eventTypeId: number;
    limit: number | null;
    window: "day" | "week" | "month" | null;
  }): Promise<Omit<EffectiveLimitsResult, "userId"> | null> {
    if (!limit || !window) {
      return {
        currentCount: 0,
        limit: null,
        window: null,
        isWithinLimit: true,
        remainingSlots: null,
      };
    }

    const now = dayjs();
    let windowStart: Date;

    switch (window) {
      case "day":
        windowStart = now.startOf("day").toDate();
        break;
      case "week":
        windowStart = now.startOf("week").toDate();
        break;
      case "month":
        windowStart = now.startOf("month").toDate();
        break;
      default:
        windowStart = now.startOf("day").toDate();
    }

    const currentCount = await this.prisma.booking.count({
      where: {
        userId,
        eventTypeId,
        createdAt: {
          gte: windowStart,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
    });

    return {
      currentCount,
      limit,
      window,
      isWithinLimit: currentCount < limit,
      remainingSlots: Math.max(0, limit - currentCount),
    };
  }
}

export default RoundRobinHostLimitsService;
