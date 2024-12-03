import type { Prisma, User } from "@prisma/client";

import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import logger from "@calcom/lib/logger";
import { acrossQueryValueCompatiblity } from "@calcom/lib/raqb/raqbUtils";
import { raqbQueryValueSchema } from "@calcom/lib/raqb/zod";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["getLuckyUser"] });
const { getAttributesQueryValue } = acrossQueryValueCompatiblity;
type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;
type RoutingFormResponse = {
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
  eventType: { id: number; isRRWeightsEnabled: boolean; team: { parentId?: number | null } | null };
  // all routedTeamMemberIds or all hosts of event types
  allRRHosts: {
    user: { id: number; email: string };
    createdAt: Date;
    weight?: number | null;
  }[];
  routingFormResponse: RoutingFormResponse | null;
}
// === dayjs.utc().startOf("month").toDate();
const startOfMonth = () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

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
  allRRHostsBookingsOfThisMonth,
  allRRHostsCreatedThisMonth,
}: {
  hosts: { userId: number; email: string; createdAt: Date }[];
  allRRHostsBookingsOfThisMonth: PartialBooking[];
  allRRHostsCreatedThisMonth: { userId: number; createdAt: Date }[];
}) {
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
  currentMonthBookingsOfAvailableUsers,
  bookingsOfNotAvailableUsersOfThisMonth,
  allRRHosts,
  allRRHostsBookingsOfThisMonth,
  allRRHostsCreatedThisMonth,
  attributeWeights,
}: GetLuckyUserParams<T> & FetchedData) {
  //get all bookings of all other RR hosts that are not available

  const allBookings = currentMonthBookingsOfAvailableUsers.concat(bookingsOfNotAvailableUsersOfThisMonth);

  const allHostsWithCalibration = getHostsWithCalibration({
    hosts: allRRHosts.map((host) => {
      return { email: host.user.email, userId: host.user.id, createdAt: host.createdAt };
    }),
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
  });

  // Calculate the total calibration and weight of all round-robin hosts
  let totalWeight: number;

  if (attributeWeights) {
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
    const userBookings = currentMonthBookingsOfAvailableUsers.filter(
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

async function getCurrentMonthsBookings({
  eventTypeId,
  users,
  virtualQueuesData,
}: {
  eventTypeId: number;
  users: { id: number; email: string }[];
  virtualQueuesData: VirtualQueuesDataType | null;
}) {
  return await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventTypeId,
    users,
    startDate: startOfMonth(),
    endDate: new Date(),
    virtualQueuesData,
  });
}

export async function getLuckyUser<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(getLuckyUserParams: GetLuckyUserParams<T>) {
  const {
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
  } = await fetchAllDataNeededForCalculations(getLuckyUserParams);

  const { luckyUser } = getLuckyUser_requiresDataToBePreFetched({
    ...getLuckyUserParams,
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
  });

  return luckyUser;
}

type FetchedData = {
  bookingsOfNotAvailableUsersOfThisMonth: PartialBooking[];
  currentMonthBookingsOfAvailableUsers: PartialBooking[];
  allRRHostsBookingsOfThisMonth: PartialBooking[];
  allRRHostsCreatedThisMonth: { userId: number; createdAt: Date }[];
  organizersWithLastCreated: { id: number; bookings: { createdAt: Date }[] }[];
  attributeWeights?:
    | {
        userId: number;
        weight: number;
      }[]
    | null;
  virtualQueuesData?: VirtualQueuesDataType | null;
};

export function getLuckyUser_requiresDataToBePreFetched<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>({ availableUsers, ...getLuckyUserParams }: GetLuckyUserParams<T> & FetchedData) {
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
      currentMonthBookingsOfAvailableUsers,
      bookingsOfNotAvailableUsersOfThisMonth,
      allRRHostsBookingsOfThisMonth,
      allRRHostsCreatedThisMonth,
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
      bookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers,
      organizersWithLastCreated,
    }),
    usersAndTheirBookingShortfalls,
  };
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

  const { attributeWeights, virtualQueuesData } = await prepareQueuesAndAttributesData(getLuckyUserParams);

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
      virtualQueuesData: virtualQueuesData ?? null,
    }),

    getCurrentMonthsBookings({
      eventTypeId: eventType.id,
      users: notAvailableHosts,
      virtualQueuesData: virtualQueuesData ?? null,
    }),

    getCurrentMonthsBookings({
      eventTypeId: eventType.id,
      users: allRRHosts.map((host) => {
        return { id: host.user.id, email: host.user.email };
      }),
      virtualQueuesData: virtualQueuesData ?? null,
    }),

    prisma.host.findMany({
      where: {
        userId: {
          in: allRRHosts.map((host) => host.user.id),
        },
        eventTypeId: eventType.id,
        isFixed: false,
        createdAt: {
          gte: startOfMonth(),
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

  log.debug(
    "fetchAllDataNeededForCalculations",
    safeStringify({
      currentMonthBookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers.length,
      bookingsOfNotAvailableUsersOfThisMonth: bookingsOfNotAvailableUsersOfThisMonth.length,
      allRRHostsBookingsOfThisMonth: allRRHostsBookingsOfThisMonth.length,
      allRRHostsCreatedThisMonth: allRRHostsCreatedThisMonth.length,
      virtualQueuesData,
      attributeWeights,
    })
  );

  return {
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
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
    currentMonthBookingsOfAvailableUsers,
    bookingsOfNotAvailableUsersOfThisMonth,
    allRRHostsBookingsOfThisMonth,
    allRRHostsCreatedThisMonth,
    organizersWithLastCreated,
    attributeWeights,
    virtualQueuesData,
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
        currentMonthBookingsOfAvailableUsers: currentMonthBookingsOfRemainingAvailableUsers,
        bookingsOfNotAvailableUsersOfThisMonth,
        allRRHostsBookingsOfThisMonth,
        allRRHostsCreatedThisMonth,
        organizersWithLastCreated,
        attributeWeights,
        virtualQueuesData,
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
    const attributeWithEnabledWeights = await prisma.attribute.findFirst({
      where: {
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
      // Virtual queues are defined by the attribute that has weights and is used with 'Value of field ...'
      const queueAndAtributeWeightData = await getQueueAndAttributeWeightData(
        allRRHosts,
        routingFormResponse,
        attributeWithEnabledWeights
      );

      log.debug(`attributeWithEnabledWeights ${safeStringify(attributeWithEnabledWeights)}`);

      if (queueAndAtributeWeightData?.averageWeightsHosts && queueAndAtributeWeightData?.virtualQueuesData) {
        attributeWeights = queueAndAtributeWeightData?.averageWeightsHosts;
        virtualQueuesData = queueAndAtributeWeightData?.virtualQueuesData;
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
            const weight = attributeOptionWithUsers?.assignedUsers.find(
              (assignedUser) => rrHost.user.id === assignedUser.member.userId
            )?.weight;

            if (weight) {
              if (allRRHostsWeights.has(rrHost.user.id)) {
                allRRHostsWeights.get(rrHost.user.id)?.push(weight);
              } else {
                allRRHostsWeights.set(rrHost.user.id, [weight]);
              }
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
