import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getIntervalStartDate, getIntervalEndDate } from "@calcom/features/bookings/lib/getLuckyUser";
import { RRResetInterval, RRTimestampBasis } from "@calcom/prisma/enums";

const DEFAULT_GROUP_ID = "default";

type RRHost<T> = {
  isFixed: boolean;
  createdAt: Date | null;
  priority?: number | null;
  weight?: number | null;
  groupId?: string | null;
  user: T & { id: number };
};

export type RankHostsByShortfallParams<T> = {
  hosts: RRHost<T>[];
  eventType: {
    id: number;
    isRRWeightsEnabled: boolean;
    team: {
      rrResetInterval: RRResetInterval | null;
      rrTimestampBasis: RRTimestampBasis;
    } | null;
  };
  partialLoadPercentage: number;
  partialLoadMinimum: number;
  rotationSeed?: number;
};

export type RankHostsByShortfallResult<T> = {
  selectedHosts: RRHost<T>[];
  totalHosts: number;
  loadedHosts: number;
  isPartialLoad: boolean;
};

/**
 * Ranks round-robin hosts by booking shortfall and selects a subset for partial loading.
 * This is used to reduce Google Calendar API calls for large round-robin events.
 *
 * The algorithm:
 * 1. Separates fixed hosts (always included) from RR hosts
 * 2. Calculates booking shortfall for each RR host based on weights
 * 3. Sorts hosts by shortfall (most "owed" bookings first)
 * 4. Uses a rotating seed to break ties for fairness over time
 * 5. Ensures at least one host from each RR group is included
 * 6. Returns the top N% of hosts based on configuration
 */
export class RRHostRankingService {
  constructor(private bookingRepo: BookingRepository) {}

  async rankAndSelectHosts<T>({
    hosts,
    eventType,
    partialLoadPercentage,
    partialLoadMinimum,
    rotationSeed,
  }: RankHostsByShortfallParams<T>): Promise<RankHostsByShortfallResult<T>> {
    const fixedHosts = hosts.filter((h) => h.isFixed);
    const rrHosts = hosts.filter((h) => !h.isFixed);

    if (rrHosts.length === 0) {
      return {
        selectedHosts: fixedHosts,
        totalHosts: hosts.length,
        loadedHosts: fixedHosts.length,
        isPartialLoad: false,
      };
    }

    const targetCount = Math.max(
      partialLoadMinimum,
      Math.ceil((rrHosts.length * partialLoadPercentage) / 100)
    );

    if (targetCount >= rrHosts.length) {
      return {
        selectedHosts: hosts,
        totalHosts: hosts.length,
        loadedHosts: hosts.length,
        isPartialLoad: false,
      };
    }

    const interval =
      eventType.isRRWeightsEnabled && eventType.team?.rrResetInterval
        ? eventType.team.rrResetInterval
        : RRResetInterval.MONTH;

    const rrTimestampBasis =
      eventType.isRRWeightsEnabled && eventType.team?.rrTimestampBasis
        ? eventType.team.rrTimestampBasis
        : RRTimestampBasis.CREATED_AT;

    const startDate = getIntervalStartDate({ interval, rrTimestampBasis });
    const endDate = getIntervalEndDate({ interval, rrTimestampBasis });

    const userIds = rrHosts.map((h) => h.user.id);
    const bookingCounts = await this.bookingRepo.getBookingCountsPerUser({
      eventTypeId: eventType.id,
      userIds,
      startDate,
      endDate,
      rrTimestampBasis,
    });

    const totalBookings = Array.from(bookingCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalWeight = rrHosts.reduce((sum, host) => sum + (host.weight ?? 100), 0);

    const hostsWithShortfall = rrHosts.map((host) => {
      const weight = host.weight ?? 100;
      const targetPercentage = weight / totalWeight;
      const targetBookings = totalBookings * targetPercentage;
      const actualBookings = bookingCounts.get(host.user.id) ?? 0;
      const shortfall = targetBookings - actualBookings;

      return {
        host,
        shortfall,
        weight,
        actualBookings,
      };
    });

    const seed = rotationSeed ?? this.getWeeklyRotationSeed(eventType.id);

    hostsWithShortfall.sort((a, b) => {
      const shortfallDiff = b.shortfall - a.shortfall;
      if (Math.abs(shortfallDiff) > 0.001) {
        return shortfallDiff;
      }

      const weightDiff = b.weight - a.weight;
      if (weightDiff !== 0) {
        return weightDiff;
      }

      const aHash = this.hashUserId(a.host.user.id, seed);
      const bHash = this.hashUserId(b.host.user.id, seed);
      return bHash - aHash;
    });

    const selectedRRHosts: RRHost<T>[] = [];
    const selectedUserIds = new Set<number>();
    const groupsRepresented = new Set<string>();

    const hostsByGroup = new Map<string, typeof hostsWithShortfall>();
    for (const item of hostsWithShortfall) {
      const groupId = item.host.groupId ?? DEFAULT_GROUP_ID;
      if (!hostsByGroup.has(groupId)) {
        hostsByGroup.set(groupId, []);
      }
      hostsByGroup.get(groupId)!.push(item);
    }

    for (const [groupId, groupHosts] of Array.from(hostsByGroup.entries())) {
      if (groupHosts.length > 0) {
        const bestInGroup = groupHosts[0];
        selectedRRHosts.push(bestInGroup.host);
        selectedUserIds.add(bestInGroup.host.user.id);
        groupsRepresented.add(groupId);
      }
    }

    for (const item of hostsWithShortfall) {
      if (selectedRRHosts.length >= targetCount) {
        break;
      }
      if (!selectedUserIds.has(item.host.user.id)) {
        selectedRRHosts.push(item.host);
        selectedUserIds.add(item.host.user.id);
      }
    }

    const selectedHosts = [...fixedHosts, ...selectedRRHosts];

    return {
      selectedHosts,
      totalHosts: hosts.length,
      loadedHosts: selectedHosts.length,
      isPartialLoad: selectedHosts.length < hosts.length,
    };
  }

  private getWeeklyRotationSeed(eventTypeId: number): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    return eventTypeId * 1000 + weekNumber;
  }

  private hashUserId(userId: number, seed: number): number {
    const combined = userId * 31 + seed;
    return ((combined * 2654435761) >>> 0) % 1000000;
  }
}
