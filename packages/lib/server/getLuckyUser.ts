import type { User } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;

const startOfMonth = dayjs().utc().startOf("month").toDate();
const endOfMonth = dayjs().utc().endOf("month").toDate();

interface GetLuckyUserParams<T extends PartialUser> {
  availableUsers: T[];
  eventType: { id: number; isRRWeightsEnabled: boolean };
  allRRHosts: {
    user: { id: number; email: string };
    createdAt: Date;
    weight?: number | null;
  }[];
}

async function leastRecentlyBookedUser<T extends PartialUser>({
  availableUsers,
  eventType,
  bookingsOfAvailableUsers,
}: GetLuckyUserParams<T> & { bookingsOfAvailableUsers: PartialBooking[] }) {
  // First we get all organizers (fixed host/single round robin user)
  const organizersWithLastCreated = await prisma.user.findMany({
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
  });

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

  if (!userIdAndAtCreatedPair) {
    throw new Error("Unable to find users by availableUser ids."); // should never happen.
  }

  const leastRecentlyBookedUser = availableUsers.sort((a, b) => {
    if (userIdAndAtCreatedPair[a.id] > userIdAndAtCreatedPair[b.id]) return 1;
    else if (userIdAndAtCreatedPair[a.id] < userIdAndAtCreatedPair[b.id]) return -1;
    // if two (or more) dates are identical, we randomize the order
    else return Math.random() > 0.5 ? 1 : -1;
  })[0];

  return leastRecentlyBookedUser;
}

async function getCalibration(
  eventTypeId: number,
  hosts: { userId: number; email: string; createdAt: Date }[]
) {
  // get calibration for newly added hosts
  const newHosts = await prisma.host.findMany({
    where: {
      userId: {
        in: hosts.map((host) => host.userId),
      },
      eventTypeId,
      isFixed: false,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  if (newHosts.length) {
    const existingBookings = await BookingRepository.getAllBookingsForRoundRobin({
      eventTypeId,
      users: hosts.map((host) => {
        return { id: host.userId, email: host.email };
      }),
      startDate: startOfMonth,
      endDate: dayjs.utc().toDate(),
    });

    // calculate calibration for new hosts
    if (newHosts.length && existingBookings.length) {
      const newHostsWithCalibration = newHosts.map((newHost) => {
        const existingBookingsBeforeAdded = existingBookings.filter(
          (booking) =>
            booking.userId !== newHost.userId && dayjs(booking.startTime).isBefore(dayjs(newHost.createdAt))
        );

        if (existingBookingsBeforeAdded.length) {
          const hostsAddedBefore = hosts.filter(
            (host) => host.userId !== newHost.userId && dayjs(host.createdAt).isBefore(newHost.createdAt)
          );

          const averageBookingsPerHost = existingBookingsBeforeAdded.length / hostsAddedBefore.length;
          return {
            ...newHost,
            calibration: averageBookingsPerHost,
          };
        }

        return {
          ...newHost,
          calibration: 0,
        };
      });

      return hosts.map((host) => ({
        ...host,
        calibration:
          newHostsWithCalibration.find((newHost) => host.userId === newHost.userId)?.calibration ?? 0,
      }));
    }
  }
  return hosts.map((host) => ({ ...host, calibration: 0 }));
}

function getUsersWithHighestPriority<T extends PartialUser & { priority?: number | null }>({
  availableUsers,
}: {
  availableUsers: T[];
}) {
  const highestPriority = Math.max(...availableUsers.map((user) => user.priority ?? 2));

  return availableUsers.filter(
    (user) => user.priority === highestPriority || (user.priority == null && highestPriority === 2)
  );
}

async function getUsersBasedOnWeights<
  T extends PartialUser & {
    weight?: number | null;
  }
>({
  availableUsers,
  bookingsOfAvailableUsers,
  allRRHosts,
  eventType,
}: GetLuckyUserParams<T> & { bookingsOfAvailableUsers: PartialBooking[] }) {
  //get all bookings of all other RR hosts that are not available
  const availableUserIds = new Set(availableUsers.map((user) => user.id));

  const notAvailableHosts = allRRHosts.reduce(
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

  const bookingsOfNotAvailableUsers = await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventType.id,
    users: notAvailableHosts,
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  const allBookings = bookingsOfAvailableUsers.concat(bookingsOfNotAvailableUsers);

  const allHostsWithCalibration = await getCalibration(
    eventType.id,
    allRRHosts.map((host) => {
      return { email: host.user.email, userId: host.user.id, createdAt: host.createdAt };
    })
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
    const targetPercentage = (user.weight ?? 100) / totalWeight;

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
      bookingShortfall,
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
    usersWithMaxShortfall.filter((user) => user.weight === maxWeight).map((user) => user.id)
  );

  return availableUsers.filter((user) => userIdsWithMaxShortfallAndWeight.has(user.id));
}

// TODO: Configure distributionAlgorithm from the event type configuration
// TODO: Add 'MAXIMIZE_FAIRNESS' algorithm.
export async function getLuckyUser<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(
  distributionAlgorithm: "MAXIMIZE_AVAILABILITY" = "MAXIMIZE_AVAILABILITY",
  getLuckyUserParams: GetLuckyUserParams<T>
) {
  const { availableUsers, eventType, allRRHosts } = getLuckyUserParams;

  if (availableUsers.length === 1) {
    return availableUsers[0];
  }

  const currentMonthBookingsOfAvailableUsers = await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventType.id,
    users: availableUsers.map((user) => {
      return { id: user.id, email: user.email };
    }),
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  switch (distributionAlgorithm) {
    case "MAXIMIZE_AVAILABILITY":
      let possibleLuckyUsers = availableUsers;
      if (eventType.isRRWeightsEnabled) {
        possibleLuckyUsers = await getUsersBasedOnWeights({
          ...getLuckyUserParams,
          bookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers,
        });
      }
      const highestPriorityUsers = getUsersWithHighestPriority({ availableUsers: possibleLuckyUsers });

      if (highestPriorityUsers.length > 1) {
        const allBookingsOfAvailableUsers = await BookingRepository.getAllBookingsForRoundRobin({
          eventTypeId: eventType.id,
          users: availableUsers.map((user) => {
            return { id: user.id, email: user.email };
          }),
        });

        return leastRecentlyBookedUser<T>({
          ...getLuckyUserParams,
          availableUsers: highestPriorityUsers,
          bookingsOfAvailableUsers: allBookingsOfAvailableUsers,
        });
      }
      return highestPriorityUsers[0];
  }
}
