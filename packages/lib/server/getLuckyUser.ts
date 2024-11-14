import type { User } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["getLuckyUser"] });
export enum DistributionMethod {
  PRIORITIZE_AVAILABILITY = "PRIORITIZE_AVAILABILITY",
  // BALANCED_ASSIGNMENT = "BALANCED_ASSIGNMENT",
  // ROUND_ROBIN (for fairness, rotating through assignees)
  // LOAD_BALANCED (ensuring an even workload)
}

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;

interface GetLuckyUserParams<T extends PartialUser> {
  availableUsers: [T, ...T[]]; // ensure contains at least 1
  eventType: { id: number; isRRWeightsEnabled: boolean };
  allRRHosts: {
    user: { id: number; email: string };
    createdAt: Date;
    weight?: number | null;
  }[];
}
// === dayjs.utc().startOf("month").toDate();
const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

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

function getHostsWithCalibration(
  hosts: { userId: number; email: string; createdAt: Date }[],
  allRRHostsBookingsOfThisMonth: PartialBooking[],
  allRRHostsCreatedThisMonth: { userId: number; createdAt: Date }[]
) {
  const existingBookings = allRRHostsBookingsOfThisMonth;

  // Return early if there are no new hosts or no existing bookings
  if (allRRHostsCreatedThisMonth.length === 0 || existingBookings.length === 0) {
    return hosts.map((host) => ({ ...host, calibration: 0 }));
  }

  // Helper function to calculate calibration for a new host
  function calculateCalibration(newHost: { userId: number; createdAt: Date }) {
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
      "calculateCalibration",
      safeStringify({
        newHost,
        existingBookingsBeforeAdded: existingBookingsBeforeAdded.length,
        hostsAddedBefore: hostsAddedBefore.length,
        calibration,
      })
    );
    return calibration;
  }
  // Calculate calibration for each new host and store in a Map
  const newHostsWithCalibration = new Map(
    allRRHostsCreatedThisMonth.map((newHost) => [
      newHost.userId,
      { ...newHost, calibration: calculateCalibration(newHost) },
    ])
  );
  // Map hosts with their respective calibration values
  return hosts.map((host) => ({
    ...host,
    calibration: newHostsWithCalibration.get(host.userId)?.calibration ?? 0,
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

function filterUsersBasedOnWeights<
  T extends PartialUser & {
    weight?: number | null;
  }
>({
  availableUsers,
  bookingsOfAvailableUsers,
  bookingsOfNotAvailableUsersOfThisMonth,
  allRRHosts,
  allRRHostsBookingsOfThisMonth,
  allRRHostsCreatedThisMonth,
}: GetLuckyUserParams<T> & {
  bookingsOfAvailableUsers: PartialBooking[];
  bookingsOfNotAvailableUsersOfThisMonth: PartialBooking[];
  allRRHostsBookingsOfThisMonth: PartialBooking[];
  allRRHostsCreatedThisMonth: { userId: number; createdAt: Date }[];
}) {
  //get all bookings of all other RR hosts that are not available

  const allBookings = bookingsOfAvailableUsers.concat(bookingsOfNotAvailableUsersOfThisMonth);

  const allHostsWithCalibration = getHostsWithCalibration(
    allRRHosts.map((host) => {
      return { email: host.user.email, userId: host.user.id, createdAt: host.createdAt };
    }),
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth
  );

  // Calculate the total calibration and weight of all round-robin hosts
  const totalWeight = allRRHosts.reduce((totalWeight, host) => {
    totalWeight += host.weight ?? 100;
    return totalWeight;
  }, 0);

  const totalCalibration = allHostsWithCalibration.reduce((totalCalibration, host) => {
    totalCalibration += host.calibration;
    return totalCalibration;
  }, 0);

  // Calculate booking shortfall for each available user
  const usersWithBookingShortfalls = availableUsers.map((user) => {
    const userWeight = user.weight ?? 100;
    const targetPercentage = userWeight / totalWeight;
    const userBookings = bookingsOfAvailableUsers.filter(
      (booking) =>
        booking.userId === user.id || booking.attendees.some((attendee) => attendee.email === user.email)
    );

    const targetNumberOfBookings = (allBookings.length + totalCalibration) * targetPercentage;
    // I need to get the user's current calibration here
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

  log.debug({
    userIdsWithMaxShortfallAndWeight: userIdsWithMaxShortfallAndWeight,
    usersWithMaxShortfall: usersWithMaxShortfall.map((user) => user.email),
    usersWithBookingShortfalls: safeStringify(
      usersWithBookingShortfalls.map((user) => ({
        calibration: user.calibration,
        bookingShortfall: user.bookingShortfall,
        email: user.email,
        targetNumberOfBookings: user.targetNumberOfBookings,
        weight: user.weight,
        numBookings: user.numBookings,
      }))
    ),
    remainingUsersAfterWeightFilter: remainingUsersAfterWeightFilter.map((user) => user.email),
  });

  if (!isNonEmptyArray(remainingUsersAfterWeightFilter)) {
    throw new Error("Internal Error: Weight filter should never return length=0.");
  }
  return {
    remainingUsersAfterWeightFilter,
    usersAndTheirBookingShortfalls: usersWithBookingShortfalls.map((user) => ({
      id: user.id,
      calibration: user.calibration,
      bookingShortfall: user.bookingShortfall,
    })),
  };
}

async function getCurrentMonthsBookings({
  eventTypeId,
  users,
}: {
  eventTypeId: number;
  users: { id: number; email: string }[];
}) {
  return await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventTypeId,
    users,
    startDate: startOfMonth,
    endDate: new Date(),
  });
}

export async function getLuckyUser<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(
  distributionMethod: DistributionMethod = DistributionMethod.PRIORITIZE_AVAILABILITY,
  getLuckyUserParams: GetLuckyUserParams<T>
) {
  const {
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
  } = await fetchAllDataNeededForCalculations(getLuckyUserParams);

  const { luckyUser } = getLuckyUser_requiresDataToBePreFetched(distributionMethod, {
    ...getLuckyUserParams,
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
  });

  return luckyUser;
}

// TODO: Configure distributionAlgorithm from the event type configuration
// TODO: Add 'MAXIMIZE_FAIRNESS' algorithm.
export function getLuckyUser_requiresDataToBePreFetched<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(
  distributionMethod: DistributionMethod = DistributionMethod.PRIORITIZE_AVAILABILITY,
  {
    availableUsers,
    ...getLuckyUserParams
  }: GetLuckyUserParams<T> & {
    bookingsOfNotAvailableUsersOfThisMonth: PartialBooking[];
    currentMonthBookingsOfAvailableUsers: PartialBooking[];
    allRRHostsBookingsOfThisMonth: PartialBooking[];
    allRRHostsCreatedThisMonth: { userId: number; createdAt: Date }[];
    organizersWithLastCreated: { id: number; bookings: { createdAt: Date }[] }[];
  }
) {
  const {
    eventType,
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
  } = getLuckyUserParams;

  // there is only one user
  if (availableUsers.length === 1) {
    return { luckyUser: availableUsers[0], usersAndTheirBookingShortfalls: [] };
  }

  switch (distributionMethod) {
    case DistributionMethod.PRIORITIZE_AVAILABILITY: {
      let usersAndTheirBookingShortfalls: { id: number; bookingShortfall: number; calibration: number }[] =
        [];
      if (eventType.isRRWeightsEnabled) {
        const {
          remainingUsersAfterWeightFilter,
          usersAndTheirBookingShortfalls: _usersAndTheirBookingShortfalls,
        } = filterUsersBasedOnWeights({
          ...getLuckyUserParams,
          availableUsers,
          bookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers,
          bookingsOfNotAvailableUsersOfThisMonth,
          allRRHostsBookingsOfThisMonth,
          allRRHostsCreatedThisMonth,
        });
        availableUsers = remainingUsersAfterWeightFilter;
        usersAndTheirBookingShortfalls = _usersAndTheirBookingShortfalls;
      }
      const highestPriorityUsers = getUsersWithHighestPriority({
        availableUsers,
      });
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
          bookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers,
          organizersWithLastCreated,
        }),
        usersAndTheirBookingShortfalls,
      };
    }
  }
}

async function fetchAllDataNeededForCalculations<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(getLuckyUserParams: GetLuckyUserParams<T>) {
  const startTime = performance.now();

  const { availableUsers, allRRHosts, eventType } = getLuckyUserParams;
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

  const [
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
  ] = await Promise.all([
    getCurrentMonthsBookings({
      eventTypeId: eventType.id,
      users: availableUsers.map((user) => {
        return { id: user.id, email: user.email };
      }),
    }),

    getCurrentMonthsBookings({
      eventTypeId: eventType.id,
      users: notAvailableHosts,
    }),

    getCurrentMonthsBookings({
      eventTypeId: eventType.id,
      users: allRRHosts.map((host) => {
        return { id: host.user.id, email: host.user.email };
      }),
    }),

    prisma.host.findMany({
      where: {
        userId: {
          in: allRRHosts.map((host) => host.user.id),
        },
        eventTypeId: eventType.id,
        isFixed: false,
        createdAt: {
          gte: startOfMonth,
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

  const endTime = performance.now();
  log.info(`fetchAllDataNeededForCalculations took ${endTime - startTime}ms`);

  console.log({
    currentMonthBookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers.length,
    bookingsOfNotAvailableUsersOfThisMonth: bookingsOfNotAvailableUsersOfThisMonth.length,
    allRRHostsBookingsOfThisMonth: allRRHostsBookingsOfThisMonth.length,
    allRRHostsCreatedThisMonth: allRRHostsCreatedThisMonth.length,
  });

  return {
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
  };
}

type AvailableUserBase = PartialUser & {
  priority?: number | null;
  weight?: number | null;
};

export async function getOrderedListOfLuckyUsers<AvailableUser extends AvailableUserBase>(
  distributionMethod: DistributionMethod = DistributionMethod.PRIORITIZE_AVAILABILITY,
  getLuckyUserParams: GetLuckyUserParams<AvailableUser>
) {
  const { availableUsers, eventType } = getLuckyUserParams;

  const {
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
  } = await fetchAllDataNeededForCalculations(getLuckyUserParams);

  log.info(
    "getOrderedListOfLuckyUsers",
    safeStringify({
      availableUsers: availableUsers.map((user) => {
        return { id: user.id, email: user.email, priority: user.priority, weight: user.weight };
      }),
      currentMonthBookingsOfAvailableUsers,
      bookingsOfNotAvailableUsersOfThisMonth,
      allRRHostsBookingsOfThisMonth,
      allRRHostsCreatedThisMonth,
      organizersWithLastCreated,
    })
  );

  let remainingAvailableUsers = [...availableUsers];
  let currentMonthBookingsOfRemainingAvailableUsers = [...currentMonthBookingsOfAvailableUsers];
  const orderedUsersSet = new Set<AvailableUser>();
  const perUserBookingsCount: Record<number, number> = {};

  const startTime = performance.now();
  let usersAndTheirBookingShortfalls: { id: number; bookingShortfall: number; calibration: number }[] = [];
  // Keep getting lucky users until none remain
  while (remainingAvailableUsers.length > 0) {
    const { luckyUser, usersAndTheirBookingShortfalls: _usersAndTheirBookingShortfalls } =
      getLuckyUser_requiresDataToBePreFetched(distributionMethod, {
        ...getLuckyUserParams,
        eventType,
        availableUsers: remainingAvailableUsers as [AvailableUser, ...AvailableUser[]],
        currentMonthBookingsOfAvailableUsers: currentMonthBookingsOfRemainingAvailableUsers,
        bookingsOfNotAvailableUsersOfThisMonth,
        allRRHostsBookingsOfThisMonth,
        allRRHostsCreatedThisMonth,
        organizersWithLastCreated,
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
    perUserBookingsCount[luckyUser.id] = currentMonthBookingsOfAvailableUsers.filter(
      (booking) => booking.userId === luckyUser.id
    ).length;
    remainingAvailableUsers = remainingAvailableUsers.filter((user) => user.id !== luckyUser.id);
    currentMonthBookingsOfRemainingAvailableUsers = currentMonthBookingsOfRemainingAvailableUsers.filter(
      (booking) => remainingAvailableUsers.map((user) => user.id).includes(booking.userId ?? 0)
    );
  }

  const endTime = performance.now();
  log.info(`getOrderedListOfLuckyUsers took ${endTime - startTime}ms`);

  const bookingShortfalls: Record<number, number> = {};
  const calibrations: Record<number, number> = {};

  usersAndTheirBookingShortfalls.forEach((user) => {
    bookingShortfalls[user.id] = parseFloat(user.bookingShortfall.toFixed(2));
    calibrations[user.id] = parseFloat(user.calibration.toFixed(2));
  });

  const weights = remainingAvailableUsers.reduce((acc, user) => {
    acc[user.id] = user.weight ?? 100;
    return acc;
  }, {} as Record<number, number>);

  return {
    users: Array.from(orderedUsersSet),
    perUserData: {
      bookingsCount: perUserBookingsCount,
      bookingShortfalls: eventType.isRRWeightsEnabled ? bookingShortfalls : null,
      calibrations: eventType.isRRWeightsEnabled ? calibrations : null,
      weights: eventType.isRRWeightsEnabled ? weights : null,
    },
  };
}
