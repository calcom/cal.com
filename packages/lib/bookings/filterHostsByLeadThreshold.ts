import { BookingRepository } from "@calcom/lib/server/repository/booking";

const START_OF_MONTH = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

export const errorCodes = {
  MAX_LEAD_THRESHOLD_FALSY: "Max lead threshold should be null or > 1, not 0.",
} as const;

function getMostRecentDate(dates: Date[]): Date {
  if (dates.length === 0)
    throw new Error("Array of date length provided in getMostRecentDate should not be empty.");

  return dates.reduce((mostRecent, current) => (current > mostRecent ? current : mostRecent));
}

const computeLeadOffsets = async <T = Record<string, unknown>>({
  hosts,
  eventTypeId,
}: {
  eventTypeId: number;
  hosts: (T & {
    isFixed: false;
    createdAt: Date;
    user: {
      id: number;
      email: string;
    };
  })[];
}) => {
  if (!hosts.length) return [];
  // use either the beginning of the month, of the most recently added host; whichever is most recent
  const startDate = getMostRecentDate([...hosts.map(({ createdAt }) => createdAt), START_OF_MONTH]);
  // we need booking data now, this cannot be queried ahead of time as it requires knowing the most recent host date
  // data only available after the initial call.
  const bookingCounts = await BookingRepository.groupByActiveBookingCounts({
    startDate,
    users: hosts.map((host) => ({
      ...host.user,
    })),
    eventTypeId,
  });
  const { minBookingCount, bookingCountMap } = bookingCounts.reduce(
    (
      acc: {
        minBookingCount: number;
        bookingCountMap: Record<number, number>;
      },
      booking
    ) => {
      // satisfy TS, obviously as we've where'd on userId it cannot be null but try telling TS that..
      if (!booking.userId) return acc;
      acc.minBookingCount = Math.min(acc.minBookingCount, booking._count._all || Infinity);
      acc.bookingCountMap[booking.userId] = booking._count._all;
      return acc;
    },
    {
      minBookingCount: bookingCounts.length < hosts.length ? 0 : Infinity,
      bookingCountMap: {},
    }
  );

  return hosts.map((host) => {
    const leadOffset = (bookingCountMap[host.user.id] || 0) - minBookingCount;
    return {
      ...host,
      leadOffset,
    };
  });
};

export const _filterHostByLeadThreshold = ({
  host,
  maxLeadThreshold,
}: {
  host: { leadOffset: number };
  maxLeadThreshold: number;
}) => {
  // it's possible that maxLeadThreshold is given as 0, which makes '0' sense.
  if (!maxLeadThreshold) {
    throw new Error(errorCodes.MAX_LEAD_THRESHOLD_FALSY);
  }
  return host.leadOffset < maxLeadThreshold; // leadOffset is 0-indexed.
};

/*
 * Filter the hosts by lead threshold, disqualifying hosts that have exceeded the maximum
 *
 * @throws errorCodes.MAX_LEAD_THRESHOLD_FALSY
 */
export const filterHostsByLeadThreshold = async <T = Record<string, unknown>>({
  hosts,
  maxLeadThreshold,
  eventTypeId,
}: {
  hosts: ({ isFixed: boolean; createdAt: Date; user: { id: number; email: string } } & T)[];
  maxLeadThreshold: number | null;
  eventTypeId: number;
}): Promise<Omit<T, "leadOffset">[]> => {
  if (maxLeadThreshold === null) return hosts;
  // Calculate offsets for non-fixed hosts only once
  const computedRoundRobinHosts = await computeLeadOffsets<T>({
    eventTypeId,
    hosts: hosts.filter((host) => !host.isFixed).map((host) => ({ ...host, isFixed: false as const })),
  });
  // Track indices of non-fixed hosts for easy mapping back to the original order
  let roundRobinIndex = 0;
  return hosts
    .map((host) => {
      if (host.isFixed) {
        // Return fixed hosts as they are
        return host as Omit<T, "leadOffset">;
      } else {
        // Apply lead threshold filtering on round-robin hosts
        const roundRobinHost = { ...computedRoundRobinHosts[roundRobinIndex++] };
        if (
          _filterHostByLeadThreshold({
            host: roundRobinHost,
            maxLeadThreshold,
          })
        ) {
          // cleanup with destructure to remove leadOffset
          const { leadOffset, ...roundRobinHostWithoutLeadOffset } = roundRobinHost;
          return roundRobinHostWithoutLeadOffset;
        }
        return null;
      }
    })
    .filter((host): host is Omit<T, "leadOffset"> => host !== null);
};
