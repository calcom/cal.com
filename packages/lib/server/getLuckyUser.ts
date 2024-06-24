import type { User } from "@prisma/client";

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
  allRRHosts: { user: { id: number; email: string }; weight: number; weightAdjustment: number }[];
}

async function leastRecentlyBookedUser<T extends PartialUser>({
  availableUsers,
  eventType,
  allBookings,
}: GetLuckyUserParams<T> & { allBookings: PartialBooking[] }) {
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

  const bookings = allBookings.filter((booking) =>
    booking.attendees.some((attendee) =>
      availableUsers.map((user) => user.email).includes(attendee.email ?? "")
    )
  );

  const attendeeUserIdAndAtCreatedPair = bookings.reduce((aggregate: { [userId: number]: Date }, booking) => {
    availableUsers.forEach((user) => {
      if (aggregate[user.id]) return; // Bookings are ordered DESC, so if the reducer aggregate
      // contains the user id, it's already got the most recent booking marked.
      if (!booking.attendees.map((attendee) => attendee.email).includes(user.email)) return;
      if (organizerIdAndAtCreatedPair[user.id] > booking.createdAt) return; // only consider bookings if they were created after organizer bookings
      aggregate[user.id] = booking.createdAt;
    });
    return aggregate;
  }, {});

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

function getUsersWithHighestPriority<
  T extends Pick<User, "id" | "email"> & { priority?: number | null; weight?: number | null }
>({ availableUsers }: { availableUsers: T[] }) {
  const highestPriority = Math.max(...availableUsers.map((user) => user.priority ?? 2));

  return availableUsers.filter(
    (user) => user.priority === highestPriority || (user.priority == null && highestPriority === 2)
  );
}

async function getUsersBasedOnWeights<
  T extends PartialUser & { weight?: number | null; priority?: number | null }
>({ availableUsers, allBookings, allRRHosts }: GetLuckyUserParams<T> & { allBookings: PartialBooking[] }) {
  // Filter accepted bookings
  const bookings = allBookings.filter((booking) => booking.status === BookingStatus.ACCEPTED); //probably should also add the adjusted weights

  const allWeightAdjustments = allRRHosts.reduce((sum, host) => sum + host.weightAdjustment, 0);

  // Calculate the total weight of all round-robin hosts
  const totalWeight = allRRHosts.reduce((sum, host) => sum + (host.weight ?? 100), 0);

  // Calculate booking shortfall for each available user
  const usersWithBookingShortfalls = availableUsers.map((user) => {
    const targetPercentage = (user.weight ?? 100) / totalWeight;

    const userBookings = bookings.filter(
      (booking) =>
        booking.userId === user.id || booking.attendees.some((attendee) => attendee.email === user.email)
    );

    const targetNumberOfBookings = (bookings.length + allWeightAdjustments) * targetPercentage;

    const bookingShortfall = targetNumberOfBookings - (userBookings.length + user.weightAdjustment);
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

  const luckyUsers = usersWithMaxShortfall.map((user) => {
    const { bookingShortfall, ...rest } = user;
    return rest;
  });
  return luckyUsers;
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

  // all bookings of event type of rr hosts
  const allBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: eventType.id,
      OR: [
        {
          userId: {
            in: allRRHosts.map((host) => host.user.id),
          },
        },
        {
          attendees: {
            some: {
              email: {
                in: allRRHosts.map((host) => host.user.email),
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      userId: true,
      attendees: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  switch (distributionAlgorithm) {
    case "MAXIMIZE_AVAILABILITY":
      let possibleLuckyUsers = availableUsers;
      if (eventType.isRRWeightsEnabled) {
        possibleLuckyUsers = await getUsersBasedOnWeights({ ...getLuckyUserParams, allBookings });
      }
      const highestPriorityUsers = getUsersWithHighestPriority({ availableUsers: possibleLuckyUsers });
      return leastRecentlyBookedUser<T>({
        ...getLuckyUserParams,
        availableUsers: highestPriorityUsers,
        allBookings,
      });
  }
}
