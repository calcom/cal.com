import type { LuckyUserService, RoutingFormResponse } from "@calcom/features/bookings/lib/getLuckyUser";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import logger from "@calcom/lib/logger";
import type { RRResetInterval, SelectedCalendar } from "@calcom/prisma/client";
import { RRTimestampBasis } from "@calcom/prisma/enums";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

export const errorCodes = {
  MAX_LEAD_THRESHOLD_FALSY: "Max lead threshold should be null or > 1, not 0.",
} as const;

type BaseUser = {
  id: number;
  email: string;
  credentials: CredentialForCalendarService[];
  userLevelSelectedCalendars: SelectedCalendar[];
} & Record<string, unknown>;

type BaseHost<User extends BaseUser> = {
  isFixed: boolean;
  createdAt: Date;
  priority?: number | null;
  weight?: number | null;
  weightAdjustment?: number | null;
  user: User;
};

type PerUserData = Awaited<
  ReturnType<(typeof LuckyUserService.prototype)["getOrderedListOfLuckyUsers"]>
>["perUserData"];
type WeightedPerUserData = Omit<PerUserData, "weights" | "calibrations" | "bookingShortfalls"> & {
  weights: NonNullable<PerUserData["weights"]>;
  calibrations: NonNullable<PerUserData["calibrations"]>;
  bookingShortfalls: NonNullable<PerUserData["bookingShortfalls"]>;
};

const log = logger.getSubLogger({ name: "filterHostsByLeadThreshold" });

function filterHostsByLeadThresholdWithWeights(perUserData: WeightedPerUserData, maxLeadThreshold: number) {
  const filteredUserIds: number[] = [];
  // negative shortfall means the host should receive negative bookings, so they are overbooked
  const maxShortfall = Math.max(...Object.values(perUserData.bookingShortfalls)); // least amount of bookings

  for (const userIdStr in perUserData.bookingShortfalls) {
    const shortfall = perUserData.bookingShortfalls[userIdStr];
    // if user's shortfall is more than
    if (maxShortfall - shortfall > maxLeadThreshold) {
      log.debug(
        `Host ${userIdStr} has been filtered out because the amount of bookings made him exceed the thresholds. Shortfall: ${shortfall}, Max Shortfall: ${maxShortfall}`
      );
    } else {
      filteredUserIds.push(parseInt(userIdStr, 10));
    }
  }
  return filteredUserIds;
}

function filterHostsByLeadThresholdWithoutWeights(perUserData: PerUserData, maxLeadThreshold: number) {
  const filteredUserIds: number[] = [];

  const bookingsArray = Object.values(perUserData.bookingsCount);
  const minBookings = Math.min(...bookingsArray);

  for (const userIdStr in perUserData.bookingsCount) {
    const bookingsCount = perUserData.bookingsCount[userIdStr];
    if (bookingsCount - minBookings > maxLeadThreshold) {
      log.debug(
        `Host ${userIdStr} has been filtered out because the given data made them exceed the thresholds. BookingsCount: ${bookingsCount}, MinBookings: ${minBookings}`
      );
    } else {
      filteredUserIds.push(parseInt(userIdStr, 10));
      log.debug(
        `Host Allowed ${userIdStr} has been filtered out because the given data made them exceed the thresholds. BookingsCount: ${bookingsCount}, MinBookings: ${minBookings}, MaxLeadThreshold: ${maxLeadThreshold}`
      );
    }
  }

  return filteredUserIds;
}

/*
 * Filter the hosts by lead threshold, disqualifying hosts that have exceeded the maximum
 *
 * NOTE: This function cleans up the leadOffset value so can't be used afterwards.
 *
 * @throws errorCodes.MAX_LEAD_THRESHOLD_FALSY
 */
export const filterHostsByLeadThreshold = async <T extends BaseHost<BaseUser>>({
  hosts,
  maxLeadThreshold,
  eventType,
  routingFormResponse,
}: {
  hosts: T[];
  maxLeadThreshold: number | null;
  eventType: {
    id: number;
    isRRWeightsEnabled: boolean;
    team: {
      parentId?: number | null;
      rrResetInterval: RRResetInterval | null;
      rrTimestampBasis: RRTimestampBasis;
    } | null;
    includeNoShowInRRCalculation: boolean;
  };
  routingFormResponse: RoutingFormResponse | null;
}) => {
  if (maxLeadThreshold === 0) {
    throw new Error(errorCodes.MAX_LEAD_THRESHOLD_FALSY);
  }
  if (
    maxLeadThreshold === null ||
    hosts.length < 1 ||
    (eventType.team?.rrTimestampBasis && eventType.team.rrTimestampBasis !== RRTimestampBasis.CREATED_AT)
  ) {
    return hosts; // don't apply filter.
  }

  // this needs the routing forms response too, because it needs to know what queue we are in
  const luckyUserService = getLuckyUserService();
  const orderedLuckyUsers = await luckyUserService.getOrderedListOfLuckyUsers({
    availableUsers: [
      {
        ...hosts[0].user,
        weight: hosts[0].weight ?? null,
        priority: hosts[0].priority ?? null,
      },
      ...hosts.slice(1).map((host) => ({
        ...host.user,
        weight: host.weight ?? null,
        priority: host.priority ?? null,
      })),
    ],
    eventType,
    allRRHosts: hosts,
    routingFormResponse,
  });

  const perUserData = orderedLuckyUsers["perUserData"];

  let filteredUserIds: number[];
  if (eventType.isRRWeightsEnabled) {
    // Check if any of the required data is null
    if (
      perUserData.calibrations === null ||
      perUserData.weights === null ||
      perUserData.bookingShortfalls === null
    ) {
      throw new Error("Calibrations, weights, or booking shortfalls are null");
    }
    filteredUserIds = filterHostsByLeadThresholdWithWeights(
      {
        bookingsCount: perUserData.bookingsCount,
        bookingShortfalls: perUserData.bookingShortfalls,
        calibrations: perUserData.calibrations,
        weights: perUserData.weights,
      },
      maxLeadThreshold
    );
  } else {
    filteredUserIds = filterHostsByLeadThresholdWithoutWeights(perUserData, maxLeadThreshold);
  }

  const filteredHosts = hosts.filter((host) => filteredUserIds.includes(host.user.id));
  return filteredHosts;
};
