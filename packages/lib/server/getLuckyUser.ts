import type { User } from "@prisma/client";

import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;

interface GetLuckyUserParams<T extends PartialUser> {
  availableUsers: T[];
  eventType: { id: number; isRRWeightsEnabled: boolean };
  allRRHosts: {
    user: { id: number; email: string };
    weight?: number | null;
    weightAdjustment?: number | null;
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
    weightAdjustment?: number | null;
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
  });

  const allBookings = bookingsOfAvailableUsers.concat(bookingsOfNotAvailableUsers);

  // Calculate the total weightAdjustments and weight of all round-robin hosts
  const { allWeightAdjustments, totalWeight } = allRRHosts.reduce(
    (acc, host) => {
      acc.allWeightAdjustments += host.weightAdjustment ?? 0;
      acc.totalWeight += host.weight ?? 100;
      return acc;
    },
    { allWeightAdjustments: 0, totalWeight: 0 }
  );

  // Calculate booking shortfall for each available user
  const usersWithBookingShortfalls = availableUsers.map((user) => {
    const targetPercentage = (user.weight ?? 100) / totalWeight;

    const userBookings = bookingsOfAvailableUsers.filter(
      (booking) =>
        booking.userId === user.id || booking.attendees.some((attendee) => attendee.email === user.email)
    );

    const targetNumberOfBookings = (allBookings.length + allWeightAdjustments) * targetPercentage;
    const bookingShortfall = targetNumberOfBookings - (userBookings.length + (user.weightAdjustment ?? 0));

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
    weightAdjustment?: number | null;
  }
>(
  distributionAlgorithm: "MAXIMIZE_AVAILABILITY" = "MAXIMIZE_AVAILABILITY",
  getLuckyUserParams: GetLuckyUserParams<T>
) {
  const { availableUsers, eventType, allRRHosts } = getLuckyUserParams;

  if (availableUsers.length === 1) {
    return availableUsers[0];
  }

  const bookingsOfAvailableUsers = await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventType.id,
    users: availableUsers.map((user) => {
      return { id: user.id, email: user.email };
    }),
  });

  switch (distributionAlgorithm) {
    case "MAXIMIZE_AVAILABILITY":
      let possibleLuckyUsers = availableUsers;
      if (eventType.isRRWeightsEnabled) {
        possibleLuckyUsers = await getUsersBasedOnWeights({
          ...getLuckyUserParams,
          bookingsOfAvailableUsers,
        });
      }
      const highestPriorityUsers = getUsersWithHighestPriority({ availableUsers: possibleLuckyUsers });

      return leastRecentlyBookedUser<T>({
        ...getLuckyUserParams,
        availableUsers: highestPriorityUsers,
        bookingsOfAvailableUsers,
      });
  }
}
