import type { Prisma, User } from "@prisma/client";

import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import dayjs from "@calcom/dayjs";
import { getBusyCalendarTimes } from "@calcom/lib/CalendarManager";
import logger from "@calcom/lib/logger";
import { acrossQueryValueCompatiblity } from "@calcom/lib/raqb/raqbUtils";
import { raqbQueryValueSchema } from "@calcom/lib/raqb/zod";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";
import { BookingStatus, RRTimestampBasis, RRResetInterval } from "@calcom/prisma/enums";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { mergeOverlappingRanges } from "../date-ranges";

const log = logger.getSubLogger({ prefix: ["getLuckyUser"] });
const { getAttributesQueryValue } = acrossQueryValueCompatiblity;
type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;
export type RoutingFormResponse = {
  response: Prisma.JsonValue;
  chosenRouteId: string | null;
  form: {
    fields: Prisma.JsonValue;
    routes: Prisma.JsonValue;
  };
};

type AttributeWithWeights = {
  name: string;
  slug: string;
  type: AttributeType;
  id: string;
  options: {
    id: string;
    value: string;
    slug: string;
    assignedUsers: {
      weight: number | null;
      member: {
        userId: number;
      };
    }[];
  }[];
};

type VirtualQueuesDataType = {
  chosenRouteId: string;
  fieldOptionData: {
    fieldId: string;
    selectedOptionIds: string | number | string[];
  };
};

interface GetLuckyUserParams<T extends PartialUser> {
  availableUsers: [T, ...T[]]; // ensure contains at least 1
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
  // all routedTeamMemberIds or all hosts of event types
  allRRHosts: {
    user: {
      id: number;
      email: string;
      credentials: CredentialForCalendarService[];
      userLevelSelectedCalendars: SelectedCalendar[];
    };
    createdAt: Date;
    weight?: number | null;
  }[];
  routingFormResponse: RoutingFormResponse | null;
  meetingStartTime?: Date;
}

// === dayjs.utc().startOf("month").toDate();
const startOfMonth = (date: Date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const startOfDay = (date: Date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const endOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

const endOfMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

export const getIntervalEndDate = ({
  interval,
  rrTimestampBasis,
  meetingStartTime,
}: {
  interval: RRResetInterval;
  rrTimestampBasis: RRTimestampBasis;
  meetingStartTime?: Date;
}) => {
  if (rrTimestampBasis === RRTimestampBasis.START_TIME) {
    if (!meetingStartTime) {
      throw new Error("Meeting start time is required");
    }
    if (interval === RRResetInterval.DAY) {
      return endOfDay(meetingStartTime);
    }
    return endOfMonth(meetingStartTime);
  }

  return new Date();
};

export const getIntervalStartDate = ({
  interval,
  rrTimestampBasis,
  meetingStartTime,
}: {
  interval: RRResetInterval;
  rrTimestampBasis: RRTimestampBasis;
  meetingStartTime?: Date;
}) => {
  if (rrTimestampBasis === RRTimestampBasis.START_TIME) {
    if (!meetingStartTime) {
      throw new Error("Meeting start time is required");
    }
    if (interval === RRResetInterval.DAY) {
      return startOfDay(meetingStartTime);
    }
    return startOfMonth(meetingStartTime);
  }

  if (interval === RRResetInterval.DAY) {
    return startOfDay();
  }
  return startOfMonth();
};

// TS helper function.
const isNonEmptyArray = <T>(arr: T[]): arr is [T, ...T[]] => arr.length > 0;

function leastRecentlyBookedUser<T extends PartialUser>({
  availableUsers,
  bookingsOfAvailableUsers,
  organizersWithLastCreated,
}: GetLuckyUserParams<T> & {
  bookingsOfAvailableUsers: PartialBooking[];
  organizersWithLastCreated: { id: number; bookings: { createdAt: Date }[] }[];
}) {
  const organizerIdAndAtCreatedPair = organizersWithLastCreated.reduce(
    (keyValuePair: { [userId: number]: Date }, user) => {
      keyValuePair[user.id] = user.bookings[0]?.createdAt || new Date(0);
      return keyValuePair;
    },
    {}
  );

  const attendeeUserIdAndAtCreatedPair = bookingsOfAvailableUsers.reduce(
    (aggregate: { [userId: number]: Date }, booking) => {
      availableUsers.forEach((user) => {
        if (aggregate[user.id]) return; // Bookings are ordered DESC, so if the reducer aggregate
        // contains the user id, it's already got the most recent booking marked.
        if (!booking.attendees.map((attendee) => attendee.email).includes(user.email)) return;
        if (organizerIdAndAtCreatedPair[user.id] > booking.createdAt) return; // only consider bookings if they were created after organizer bookings
        aggregate[user.id] = booking.createdAt;
      });
      return aggregate;
    },
    {}
  );

  const userIdAndAtCreatedPair = {
    ...organizerIdAndAtCreatedPair,
    ...attendeeUserIdAndAtCreatedPair,
  };

  log.info(
    "userIdAndAtCreatedPair",
    safeStringify({
      organizerIdAndAtCreatedPair,
      attendeeUserIdAndAtCreatedPair,
      userIdAndAtCreatedPair,
    })
  );

  if (!userIdAndAtCreatedPair) {
    throw new Error("Unable to find users by availableUser ids."); // should never happen.
  }

  const leastRecentlyBookedUser = availableUsers.sort((a, b) => {
    if (userIdAndAtCreatedPair[a.id] > userIdAndAtCreatedPair[b.id]) return 1;
    else if (userIdAndAtCreatedPair[a.id] < userIdAndAtCreatedPair[b.id]) return -1;
    // if two (or more) dates are identical, we randomize the order
    else return 0;
  })[0];

  return leastRecentlyBookedUser;
}

function getHostsWithCalibration({
  hosts,
  allRRHostsBookingsOfInterval,
  allRRHostsCreatedInInterval,
  oooData,
}: {
  hosts: { userId: number; email: string; createdAt: Date }[];
  allRRHostsBookingsOfInterval: PartialBooking[];
  allRRHostsCreatedInInterval: { userId: number; createdAt: Date }[];
  oooData: OOODataType;
}) {
  // Helper function to calculate calibration for a new host
  function calculateNewHostCalibration(newHost: { userId: number; createdAt: Date }) {
    const existingBookingsBeforeAdded = existingBookings.filter(
      (booking) => booking.userId !== newHost.userId && booking.createdAt < newHost.createdAt
    );
    const hostsAddedBefore = hosts.filter(
      (host) => host.userId !== newHost.userId && host.createdAt < newHost.createdAt
    );

    const calibration =
      existingBookingsBeforeAdded.length && hostsAddedBefore.length
        ? existingBookingsBeforeAdded.length / hostsAddedBefore.length
        : 0;
    log.debug(
      "calculateNewHostCalibration",
      safeStringify({
        newHost,
        existingBookingsBeforeAdded: existingBookingsBeforeAdded.length,
        hostsAddedBefore: hostsAddedBefore.length,
        calibration,
      })
    );
    return calibration;
  }

  const existingBookings = allRRHostsBookingsOfInterval;

  const oooCalibration = new Map<number, number>();

  oooData.forEach(({ userId, oooEntries }) => {
    let calibration = 0;

    oooEntries.forEach((oooEntry) => {
      const bookingsInTimeframe = existingBookings.filter(
        (booking) =>
          booking.createdAt >= oooEntry.start &&
          booking.createdAt <= oooEntry.end &&
          booking.userId !== userId // attendee email check is missing here in case of fixed hosts
      );

      // - 1 because the we need to exclude the current user
      calibration += bookingsInTimeframe.length / (hosts.length - 1);
    });

    oooCalibration.set(userId, calibration);
  });

  let newHostsWithCalibration: Map<
    number,
    {
      calibration: number;
      userId: number;
      createdAt: Date;
    }
  > = new Map();

  if (allRRHostsCreatedInInterval.length && existingBookings.length) {
    // Calculate calibration for each new host and store in a Map
    newHostsWithCalibration = new Map(
      allRRHostsCreatedInInterval.map((newHost) => [
        newHost.userId,
        { ...newHost, calibration: calculateNewHostCalibration(newHost) },
      ])
    );
    // Map hosts with their respective calibration values
  }

  return hosts.map((host) => ({
    ...host,
    calibration:
      (newHostsWithCalibration.get(host.userId)?.calibration ?? 0) + (oooCalibration.get(host.userId) ?? 0),
  }));
}

function getUsersWithHighestPriority<T extends PartialUser & { priority?: number | null }>({
  availableUsers,
}: {
  availableUsers: T[];
}) {
  const highestPriority = Math.max(...availableUsers.map((user) => user.priority ?? 2));
  const usersWithHighestPriority = availableUsers.filter(
    (user) => user.priority === highestPriority || (user.priority == null && highestPriority === 2)
  );
  if (!isNonEmptyArray(usersWithHighestPriority)) {
    throw new Error("Internal Error: Highest Priority filter should never return length=0.");
  }

  log.info(
    "getUsersWithHighestPriority",
    safeStringify({
      highestPriorityUsers: usersWithHighestPriority.map((user) => user.id),
    })
  );
  return usersWithHighestPriority;
}

type OOODataType = { userId: number; oooEntries: { start: Date; end: Date }[] }[];

function filterUsersBasedOnWeights<
  T extends PartialUser & {
    weight?: number | null;
  }
>({
  availableUsers,
  bookingsOfAvailableUsersOfInterval,
  bookingsOfNotAvailableUsersOfInterval,
  allRRHosts,
  allRRHostsBookingsOfInterval,
  allRRHostsCreatedInInterval,
  attributeWeights,
  oooData,
}: GetLuckyUserParams<T> & FetchedData) {
  //get all bookings of all other RR hosts that are not available

  const allBookings = bookingsOfAvailableUsersOfInterval.concat(bookingsOfNotAvailableUsersOfInterval);

  const allHostsWithCalibration = getHostsWithCalibration({
    hosts: allRRHosts.map((host) => {
      return { email: host.user.email, userId: host.user.id, createdAt: host.createdAt };
    }),
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    oooData,
  });

  // Calculate the total calibration and weight of all round-robin hosts
  let totalWeight: number;

  if (attributeWeights && attributeWeights.length > 0) {
    totalWeight = attributeWeights.reduce((totalWeight, userWeight) => {
      totalWeight += userWeight.weight ?? 100;
      return totalWeight;
    }, 0);
  } else {
    totalWeight = allRRHosts.reduce((totalWeight, host) => {
      totalWeight += host.weight ?? 100;
      return totalWeight;
    }, 0);
  }

  const totalCalibration = allHostsWithCalibration.reduce((totalCalibration, host) => {
    totalCalibration += host.calibration;
    return totalCalibration;
  }, 0);

  // Calculate booking shortfall for each available user
  const usersWithBookingShortfalls = availableUsers.map((user) => {
    let userWeight = user.weight ?? 100;
    if (attributeWeights) {
      userWeight = attributeWeights.find((userWeight) => userWeight.userId === user.id)?.weight ?? 100;
    }
    const targetPercentage = userWeight / totalWeight;
    const userBookings = bookingsOfAvailableUsersOfInterval.filter(
      (booking) =>
        booking.userId === user.id || booking.attendees.some((attendee) => attendee.email === user.email)
    );

    const targetNumberOfBookings = (allBookings.length + totalCalibration) * targetPercentage;
    const userCalibration = allHostsWithCalibration.find((host) => host.userId === user.id)?.calibration ?? 0;

    const bookingShortfall = targetNumberOfBookings - (userBookings.length + userCalibration);

    return {
      ...user,
      calibration: userCalibration,
      weight: userWeight,
      targetNumberOfBookings,
      bookingShortfall,
      numBookings: userBookings.length,
    };
  });

  // Find users with the highest booking shortfall
  const maxShortfall = Math.max(...usersWithBookingShortfalls.map((user) => user.bookingShortfall));
  const usersWithMaxShortfall = usersWithBookingShortfalls.filter(
    (user) => user.bookingShortfall === maxShortfall
  );

  // ff more user's were found, find users with highest weights
  const maxWeight = Math.max(...usersWithMaxShortfall.map((user) => user.weight ?? 100));

  const userIdsWithMaxShortfallAndWeight = new Set(
    usersWithMaxShortfall
      .filter((user) => {
        const weight = user.weight ?? 100;
        return weight === maxWeight;
      })
      .map((user) => user.id)
  );

  const remainingUsersAfterWeightFilter = availableUsers.filter((user) =>
    userIdsWithMaxShortfallAndWeight.has(user.id)
  );

  log.debug(
    "filterUsersBasedOnWeights",
    safeStringify({
      userIdsWithMaxShortfallAndWeight: userIdsWithMaxShortfallAndWeight,
      usersWithMaxShortfall: usersWithMaxShortfall.map((user) => user.email),
      usersWithBookingShortfalls: usersWithBookingShortfalls.map((user) => ({
        calibration: user.calibration,
        bookingShortfall: user.bookingShortfall,
        email: user.email,
        targetNumberOfBookings: user.targetNumberOfBookings,
        weight: user.weight,
        numBookings: user.numBookings,
      })),
      remainingUsersAfterWeightFilter: remainingUsersAfterWeightFilter.map((user) => user.email),
    })
  );

  if (!isNonEmptyArray(remainingUsersAfterWeightFilter)) {
    throw new Error("Internal Error: Weight filter should never return length=0.");
  }
  return {
    remainingUsersAfterWeightFilter,
    usersAndTheirBookingShortfalls: usersWithBookingShortfalls.map((user) => ({
      id: user.id,
      calibration: user.calibration,
      bookingShortfall: user.bookingShortfall,
      weight: user.weight,
    })),
  };
}

async function getCalendarBusyTimesOfInterval(
  usersWithCredentials: {
    id: number;
    email: string;
    credentials: CredentialForCalendarService[];
    userLevelSelectedCalendars: SelectedCalendar[];
  }[],
  interval: RRResetInterval,
  rrTimestampBasis: RRTimestampBasis,
  meetingStartTime?: Date
): Promise<{ userId: number; busyTimes: (EventBusyDate & { timeZone?: string })[] }[]> {
  return Promise.all(
    usersWithCredentials.map((user) =>
      getBusyCalendarTimes(
        user.credentials,
        getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime }).toISOString(),
        getIntervalEndDate({ interval, rrTimestampBasis, meetingStartTime }).toISOString(),
        user.userLevelSelectedCalendars,
        true,
        true
      ).then((busyTimes) => ({
        userId: user.id,
        busyTimes,
      }))
    )
  );
}

async function getBookingsOfInterval({
  eventTypeId,
  users,
  virtualQueuesData,
  interval,
  includeNoShowInRRCalculation,
  rrTimestampBasis,
  meetingStartTime,
}: {
  eventTypeId: number;
  users: { id: number; email: string }[];
  virtualQueuesData: VirtualQueuesDataType | null;
  interval: RRResetInterval;
  includeNoShowInRRCalculation: boolean;
  rrTimestampBasis: RRTimestampBasis;
  meetingStartTime?: Date;
}) {
  const bookingRepo = new BookingRepository(prisma);
  return await bookingRepo.getAllBookingsForRoundRobin({
    eventTypeId: eventTypeId,
    users,
    startDate: getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime }),
    endDate: getIntervalEndDate({ interval, rrTimestampBasis, meetingStartTime }),
    virtualQueuesData,
    includeNoShowInRRCalculation,
    rrTimestampBasis,
  });
}

export async function getLuckyUser<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(getLuckyUserParams: GetLuckyUserParams<T>) {
  const {
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
    oooData,
  } = await fetchAllDataNeededForCalculations(getLuckyUserParams);

  const { luckyUser } = getLuckyUser_requiresDataToBePreFetched({
    ...getLuckyUserParams,
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
    oooData,
  });

  return luckyUser;
}

type FetchedData = {
  bookingsOfNotAvailableUsersOfInterval: PartialBooking[];
  bookingsOfAvailableUsersOfInterval: PartialBooking[];
  allRRHostsBookingsOfInterval: PartialBooking[];
  allRRHostsCreatedInInterval: { userId: number; createdAt: Date }[];
  organizersWithLastCreated: { id: number; bookings: { createdAt: Date }[] }[];
  attributeWeights?:
    | {
        userId: number;
        weight: number;
      }[]
    | null;
  virtualQueuesData?: VirtualQueuesDataType | null;
  oooData: OOODataType;
};

export function getLuckyUser_requiresDataToBePreFetched<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>({ availableUsers, ...getLuckyUserParams }: GetLuckyUserParams<T> & FetchedData) {
  const {
    eventType,
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    organizersWithLastCreated,
    oooData,
  } = getLuckyUserParams;

  // there is only one user
  if (availableUsers.length === 1) {
    return { luckyUser: availableUsers[0], usersAndTheirBookingShortfalls: [] };
  }

  let usersAndTheirBookingShortfalls: {
    id: number;
    bookingShortfall: number;
    calibration: number;
    weight: number;
  }[] = [];
  if (eventType.isRRWeightsEnabled) {
    const {
      remainingUsersAfterWeightFilter,
      usersAndTheirBookingShortfalls: _usersAndTheirBookingShortfalls,
    } = filterUsersBasedOnWeights({
      ...getLuckyUserParams,
      availableUsers,
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      oooData,
    });
    availableUsers = remainingUsersAfterWeightFilter;
    usersAndTheirBookingShortfalls = _usersAndTheirBookingShortfalls;
  }

  const highestPriorityUsers = getUsersWithHighestPriority({ availableUsers });
  // No need to round-robin through the only user, return early also.
  if (highestPriorityUsers.length === 1) {
    return {
      luckyUser: highestPriorityUsers[0],
      usersAndTheirBookingShortfalls,
    };
  }
  // TS is happy.
  return {
    luckyUser: leastRecentlyBookedUser({
      ...getLuckyUserParams,
      availableUsers: highestPriorityUsers,
      bookingsOfAvailableUsers: bookingsOfAvailableUsersOfInterval,
      organizersWithLastCreated,
    }),
    usersAndTheirBookingShortfalls,
  };
}

function isFullDayEvent(date1: Date, date2: Date) {
  const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
  const difference = Math.abs(date1.getTime() - date2.getTime());

  if (difference % MILLISECONDS_IN_A_DAY === 0) return true;
}

async function fetchAllDataNeededForCalculations<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(getLuckyUserParams: GetLuckyUserParams<T>) {
  const startTime = performance.now();

  const { availableUsers, allRRHosts, eventType, meetingStartTime } = getLuckyUserParams;
  const notAvailableHosts = (function getNotAvailableHosts() {
    const availableUserIds = new Set(availableUsers.map((user) => user.id));
    return allRRHosts.reduce(
      (
        acc: {
          id: number;
          email: string;
        }[],
        host
      ) => {
        if (!availableUserIds.has(host.user.id)) {
          acc.push({
            id: host.user.id,
            email: host.user.email,
          });
        }
        return acc;
      },
      []
    );
  })();

  const { attributeWeights, virtualQueuesData } = await prepareQueuesAndAttributesData(getLuckyUserParams);

  const interval =
    eventType.isRRWeightsEnabled && getLuckyUserParams.eventType.team?.rrResetInterval
      ? getLuckyUserParams.eventType.team?.rrResetInterval
      : RRResetInterval.MONTH;

  const rrTimestampBasis =
    eventType.isRRWeightsEnabled && getLuckyUserParams.eventType.team?.rrTimestampBasis
      ? getLuckyUserParams.eventType.team.rrTimestampBasis
      : RRTimestampBasis.CREATED_AT;

  const [
    userBusyTimesOfInterval,
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    organizersWithLastCreated,
  ] = await Promise.all([
    getCalendarBusyTimesOfInterval(
      allRRHosts.map((host) => host.user),
      interval,
      rrTimestampBasis,
      meetingStartTime
    ),
    getBookingsOfInterval({
      eventTypeId: eventType.id,
      users: availableUsers.map((user) => {
        return { id: user.id, email: user.email };
      }),
      virtualQueuesData: virtualQueuesData ?? null,
      interval,
      includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
      rrTimestampBasis,
      meetingStartTime,
    }),

    getBookingsOfInterval({
      eventTypeId: eventType.id,
      users: notAvailableHosts,
      virtualQueuesData: virtualQueuesData ?? null,
      interval,
      includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
      rrTimestampBasis,
      meetingStartTime,
    }),

    getBookingsOfInterval({
      eventTypeId: eventType.id,
      users: allRRHosts.map((host) => {
        return { id: host.user.id, email: host.user.email };
      }),
      virtualQueuesData: virtualQueuesData ?? null,
      interval,
      includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
      rrTimestampBasis,
      meetingStartTime,
    }),

    prisma.host.findMany({
      where: {
        userId: {
          in: allRRHosts.map((host) => host.user.id),
        },
        eventTypeId: eventType.id,
        isFixed: false,
        createdAt: {
          gte: getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime }),
        },
      },
    }),

    prisma.user.findMany({
      where: {
        id: {
          in: availableUsers.map((user) => user.id),
        },
      },
      select: {
        id: true,
        bookings: {
          select: {
            createdAt: true,
          },
          where: {
            eventTypeId: eventType.id,
            status: BookingStatus.ACCEPTED,
            attendees: {
              some: {
                noShow: false,
              },
            },
            // not:true won't match null, thus we need to do an OR with null case separately(for bookings that might have null value for `noShowHost` as earlier it didn't have default false)
            // https://github.com/calcom/cal.com/pull/15323#discussion_r1687728207
            OR: [
              {
                noShowHost: false,
              },
              {
                noShowHost: null,
              },
            ],
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    }),
  ]);

  const userFullDayBusyTimes = new Map<number, { start: Date; end: Date }[]>();

  userBusyTimesOfInterval.forEach((userBusyTime) => {
    const fullDayBusyTimes = userBusyTime.busyTimes
      .filter((busyTime) => {
        //timeZone is always defined when calling getBusyCalendarTimes with includeTimeZone true
        if (!busyTime.timeZone) return false;

        // make sure start date and end date is converted to 00:00 for full day busy events
        const timezoneOffset = dayjs(busyTime.start).tz(busyTime.timeZone).utcOffset() * 60000;
        let start = new Date(new Date(busyTime.start).getTime() + timezoneOffset);
        const end = new Date(new Date(busyTime.end).getTime() + timezoneOffset);

        // needed for full day busy events that started the month before
        const earliestStartTime = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
        if (start < earliestStartTime) start = earliestStartTime;

        return end.getTime() < new Date().getTime() && isFullDayEvent(start, end);
      })
      .map((busyTime) => ({ start: new Date(busyTime.start), end: new Date(busyTime.end) }));

    userFullDayBusyTimes.set(userBusyTime.userId, fullDayBusyTimes);
  });

  // get cal.com OOO data
  const oooEntries = await prisma.outOfOfficeEntry.findMany({
    where: {
      userId: {
        in: allRRHosts.map((host) => host.user.id),
      },
      end: {
        lte: getIntervalEndDate({ interval, rrTimestampBasis, meetingStartTime }),
        gte: getIntervalStartDate({ interval, rrTimestampBasis, meetingStartTime }),
      },
    },
    select: {
      start: true,
      end: true,
      userId: true,
    },
  });

  const oooEntriesGroupedByUserId = new Map<number, { start: Date; end: Date }[]>();

  oooEntries.forEach((entry) => {
    if (!oooEntriesGroupedByUserId.has(entry.userId)) {
      oooEntriesGroupedByUserId.set(entry.userId, []);
    }
    oooEntriesGroupedByUserId.get(entry.userId)!.push({ start: entry.start, end: entry.end });
  });

  const oooData: { userId: number; oooEntries: { start: Date; end: Date }[] }[] = [];

  userFullDayBusyTimes.forEach((fullDayBusyTimes, userId) => {
    const oooEntriesForUser = oooEntriesGroupedByUserId.get(userId) || [];
    const combinedEntries = [...oooEntriesForUser, ...fullDayBusyTimes];
    const oooEntries = mergeOverlappingRanges(combinedEntries);

    oooData.push({
      userId,
      oooEntries,
    });
  });

  const endTime = performance.now();
  log.info(`fetchAllDataNeededForCalculations took ${endTime - startTime}ms`);

  log.debug(
    "fetchAllDataNeededForCalculations",
    safeStringify({
      bookingsOfAvailableUsersOfInterval: bookingsOfAvailableUsersOfInterval.length,
      bookingsOfNotAvailableUsersOfInterval: bookingsOfNotAvailableUsersOfInterval.length,
      allRRHostsBookingsOfInterval: allRRHostsBookingsOfInterval.length,
      allRRHostsCreatedInInterval: allRRHostsCreatedInInterval.length,
      virtualQueuesData,
      attributeWeights,
      oooData,
    })
  );

  return {
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
    oooData,
  };
}

type AvailableUserBase = PartialUser & {
  priority: number | null;
  weight: number | null;
};

export async function getOrderedListOfLuckyUsers<AvailableUser extends AvailableUserBase>(
  getLuckyUserParams: GetLuckyUserParams<AvailableUser>
) {
  const { availableUsers, eventType } = getLuckyUserParams;

  const {
    bookingsOfAvailableUsersOfInterval,
    bookingsOfNotAvailableUsersOfInterval,
    allRRHostsBookingsOfInterval,
    allRRHostsCreatedInInterval,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
    oooData,
  } = await fetchAllDataNeededForCalculations(getLuckyUserParams);

  log.info(
    "getOrderedListOfLuckyUsers",
    safeStringify({
      availableUsers: availableUsers.map((user) => {
        return { id: user.id, email: user.email, priority: user.priority, weight: user.weight };
      }),
      bookingsOfAvailableUsersOfInterval,
      bookingsOfNotAvailableUsersOfInterval,
      allRRHostsBookingsOfInterval,
      allRRHostsCreatedInInterval,
      organizersWithLastCreated,
    })
  );

  let remainingAvailableUsers = [...availableUsers];
  let bookingsOfRemainingAvailableUsersOfInterval = [...bookingsOfAvailableUsersOfInterval];
  const orderedUsersSet = new Set<AvailableUser>();
  const perUserBookingsCount: Record<number, number> = {};

  const startTime = performance.now();
  let usersAndTheirBookingShortfalls: {
    id: number;
    bookingShortfall: number;
    calibration: number;
    weight: number;
  }[] = [];
  // Keep getting lucky users until none remain
  while (remainingAvailableUsers.length > 0) {
    const { luckyUser, usersAndTheirBookingShortfalls: _usersAndTheirBookingShortfalls } =
      getLuckyUser_requiresDataToBePreFetched({
        ...getLuckyUserParams,
        eventType,
        availableUsers: remainingAvailableUsers as [AvailableUser, ...AvailableUser[]],
        bookingsOfAvailableUsersOfInterval: bookingsOfRemainingAvailableUsersOfInterval,
        bookingsOfNotAvailableUsersOfInterval,
        allRRHostsBookingsOfInterval,
        allRRHostsCreatedInInterval,
        organizersWithLastCreated,
        attributeWeights,
        virtualQueuesData,
        oooData,
      });

    if (!usersAndTheirBookingShortfalls.length) {
      usersAndTheirBookingShortfalls = _usersAndTheirBookingShortfalls;
    }

    if (orderedUsersSet.has(luckyUser)) {
      // It is helpful in breaking the loop as same user is returned again and again.
      // Also, it tells a bug in the code.
      throw new Error(
        `Error building ordered list of lucky users. The lucky user ${luckyUser.email} is already in the set.`
      );
    }

    orderedUsersSet.add(luckyUser);
    perUserBookingsCount[luckyUser.id] = bookingsOfAvailableUsersOfInterval.filter(
      (booking) => booking.userId === luckyUser.id
    ).length;
    remainingAvailableUsers = remainingAvailableUsers.filter((user) => user.id !== luckyUser.id);
    bookingsOfRemainingAvailableUsersOfInterval = bookingsOfRemainingAvailableUsersOfInterval.filter(
      (booking) => remainingAvailableUsers.map((user) => user.id).includes(booking.userId ?? 0)
    );
  }

  const endTime = performance.now();
  log.info(`getOrderedListOfLuckyUsers took ${endTime - startTime}ms`);

  const bookingShortfalls: Record<number, number> = {};
  const calibrations: Record<number, number> = {};
  const weights: Record<number, number> = {};

  usersAndTheirBookingShortfalls.forEach((user) => {
    bookingShortfalls[user.id] = parseFloat(user.bookingShortfall.toFixed(2));
    calibrations[user.id] = parseFloat(user.calibration.toFixed(2));
    weights[user.id] = user.weight;
  });

  return {
    users: Array.from(orderedUsersSet),
    isUsingAttributeWeights: !!attributeWeights && !!virtualQueuesData,
    perUserData: {
      bookingsCount: perUserBookingsCount,
      bookingShortfalls: eventType.isRRWeightsEnabled ? bookingShortfalls : null,
      calibrations: eventType.isRRWeightsEnabled ? calibrations : null,
      weights: eventType.isRRWeightsEnabled ? weights : null,
    },
  };
}

export async function prepareQueuesAndAttributesData<T extends PartialUser>({
  eventType,
  routingFormResponse,
  allRRHosts,
}: Omit<GetLuckyUserParams<T>, "availableUsers">) {
  let attributeWeights;
  let virtualQueuesData;
  const organizationId = eventType.team?.parentId;
  log.debug("prepareQueuesAndAttributesData", safeStringify({ routingFormResponse, organizationId }));
  if (routingFormResponse && organizationId) {
    const routingForm = routingFormResponse?.form;
    const routes = zodRoutes.parse(routingForm.routes);
    const chosenRoute = routes?.find((route) => route.id === routingFormResponse.chosenRouteId);

    if (chosenRoute && "attributeIdForWeights" in chosenRoute) {
      const attributeIdForWeights = chosenRoute.attributeIdForWeights;

      const attributeWithEnabledWeights = await prisma.attribute.findUnique({
        where: {
          id: attributeIdForWeights,
          teamId: organizationId,
          isWeightsEnabled: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          options: {
            select: {
              id: true,
              value: true,
              slug: true,
              assignedUsers: {
                select: {
                  member: {
                    select: {
                      userId: true,
                    },
                  },
                  weight: true,
                },
              },
            },
          },
        },
      });

      if (attributeWithEnabledWeights) {
        // Virtual queues are defined by the attribute that is used for weights
        const queueAndAtributeWeightData = await getQueueAndAttributeWeightData(
          allRRHosts,
          routingFormResponse,
          attributeWithEnabledWeights
        );
        if (
          queueAndAtributeWeightData?.averageWeightsHosts &&
          queueAndAtributeWeightData?.virtualQueuesData
        ) {
          attributeWeights = queueAndAtributeWeightData?.averageWeightsHosts;
          virtualQueuesData = queueAndAtributeWeightData?.virtualQueuesData;
        }
      }
    }
  }
  return { attributeWeights, virtualQueuesData };
}

async function getQueueAndAttributeWeightData<T extends PartialUser & { priority?: number | null }>(
  allRRHosts: GetLuckyUserParams<T>["allRRHosts"],
  routingFormResponse: RoutingFormResponse,
  attributeWithWeights: AttributeWithWeights
) {
  let averageWeightsHosts: { userId: number; weight: number }[] = [];

  const chosenRouteId = routingFormResponse?.chosenRouteId ?? undefined;

  if (!chosenRouteId) return;

  let fieldOptionData: { fieldId: string; selectedOptionIds: string | number | string[] } | undefined;

  const routingForm = routingFormResponse?.form;

  if (routingForm && routingFormResponse) {
    const response = routingFormResponse.response as FormResponse;

    const routes = zodRoutes.parse(routingForm.routes);
    const chosenRoute = routes?.find((route) => route.id === routingFormResponse.chosenRouteId);

    if (chosenRoute && "attributesQueryValue" in chosenRoute) {
      const parsedAttributesQueryValue = raqbQueryValueSchema.parse(chosenRoute.attributesQueryValue);

      const attributesQueryValueWithLabel = getAttributesQueryValue({
        attributesQueryValue: chosenRoute.attributesQueryValue,
        attributes: [attributeWithWeights],
        dynamicFieldValueOperands: {
          fields: (routingFormResponse.form.fields as Fields) || [],
          response,
        },
      });

      const parsedAttributesQueryValueWithLabel = raqbQueryValueSchema.parse(attributesQueryValueWithLabel);

      if (parsedAttributesQueryValueWithLabel && parsedAttributesQueryValueWithLabel.children1) {
        averageWeightsHosts = getAverageAttributeWeights(
          allRRHosts,
          parsedAttributesQueryValueWithLabel.children1,
          attributeWithWeights
        );
      }

      if (parsedAttributesQueryValue && parsedAttributesQueryValue.children1) {
        fieldOptionData = getAttributesForVirtualQueues(
          response,
          parsedAttributesQueryValue.children1,
          attributeWithWeights
        );
      }
    }
  }

  if (fieldOptionData) {
    return { averageWeightsHosts, virtualQueuesData: { chosenRouteId, fieldOptionData } };
  }

  return;
}

function getAverageAttributeWeights<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(
  allRRHosts: GetLuckyUserParams<T>["allRRHosts"],
  attributesQueryValueChild: Record<
    string,
    {
      type?: string | undefined;
      properties?:
        | {
            field?: any;
            operator?: any;
            value?: any;
            valueSrc?: any;
          }
        | undefined;
    }
  >,
  attributeWithWeights: AttributeWithWeights
) {
  let averageWeightsHosts: { userId: number; weight: number }[] = [];

  const fieldValueArray = Object.values(attributesQueryValueChild).map((child) => ({
    field: child.properties?.field,
    value: child.properties?.value,
  }));

  fieldValueArray.map((obj) => {
    const attributeId = obj.field;
    const allRRHostsWeights = new Map<number, number[]>();

    if (attributeId === attributeWithWeights.id) {
      obj.value.forEach((arrayobj: string[]) => {
        arrayobj.forEach((attributeOption: string) => {
          // attributeOption is either optionId or label, we only care about labels here
          const attributeOptionWithUsers = attributeWithWeights.options.find(
            (option) => option.value.toLowerCase() === attributeOption.toLowerCase()
          );

          allRRHosts.forEach((rrHost) => {
            //assignedUser can be undefined if fallback route is hit or in the case of crm ownership
            const assignedUser = attributeOptionWithUsers?.assignedUsers.find(
              (assignedUser) => rrHost.user.id === assignedUser.member.userId
            );

            if (allRRHostsWeights.has(rrHost.user.id)) {
              allRRHostsWeights.get(rrHost.user.id)?.push(assignedUser?.weight ?? rrHost.weight ?? 100);
            } else {
              allRRHostsWeights.set(rrHost.user.id, [assignedUser?.weight ?? rrHost.weight ?? 100]);
            }
          });
        });
      });
      averageWeightsHosts = Array.from(allRRHostsWeights.entries()).map(([userId, weights]) => {
        const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
        const averageWeight = totalWeight / weights.length;

        return {
          userId,
          weight: averageWeight,
        };
      });
    }
  });
  log.debug(
    "getAverageAttributeWeights",
    safeStringify({ allRRHosts, attributesQueryValueChild, attributeWithWeights, averageWeightsHosts })
  );

  return averageWeightsHosts;
}

function getAttributesForVirtualQueues(
  response: Record<string, Pick<FormResponse[keyof FormResponse], "value">>,
  attributesQueryValueChild: Record<
    string,
    {
      type?: string | undefined;
      properties?:
        | {
            field?: any;
            operator?: any;
            value?: any;
            valueSrc?: any;
          }
        | undefined;
    }
  >,
  attributeWithWeights: { id: string }
) {
  let selectionOptions: Pick<VirtualQueuesDataType, "fieldOptionData">["fieldOptionData"] | undefined;

  const fieldValueArray = Object.values(attributesQueryValueChild).map((child) => ({
    field: child.properties?.field,
    value: child.properties?.value,
  }));

  fieldValueArray.some((obj) => {
    const attributeId = obj.field;

    if (attributeId === attributeWithWeights.id) {
      obj.value.some((arrayobj: string[]) => {
        arrayobj.some((attributeOptionId: string) => {
          const content = attributeOptionId.slice(1, -1);

          const routingFormFieldId = content.includes("field:") ? content.split("field:")[1] : null;

          if (routingFormFieldId) {
            const fieldResponse = response[routingFormFieldId];
            selectionOptions = { fieldId: routingFormFieldId, selectedOptionIds: fieldResponse.value };
            return true; // break out of all loops
          }
        });
      });
    }
  });
  return selectionOptions;
}
