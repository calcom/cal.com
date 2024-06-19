import type { User } from "@prisma/client";

import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

async function leastRecentlyBookedUser<T extends Pick<User, "id" | "email">>({
  availableUsers,
  eventTypeId,
  allBookings,
}: {
  availableUsers: T[];
  eventTypeId: number;
  allBookings: PartialBooking[];
}) {
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
          eventTypeId,
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

async function getUsersbasedOnWeights<
  T extends Pick<User, "id" | "email"> & {
    weight?: number | null;
    priority?: number | null;
  }
>({
  availableUsers,
  allBookings,
  allRRHosts,
}: {
  availableUsers: T[];
  eventTypeId: number;
  allBookings: PartialBooking[];
  allRRHosts: IsFixedAwareUser[];
}) {
  //handle adding a new host --> this is important
  //handle OOO times --> this is not so important

  // also filter out no show bookings
  const bookings = allBookings.filter((booking) => booking.status === BookingStatus.ACCEPTED);
  // we need to have the weight of all users here not just the availabile users
  const totalWeight = allRRHosts.reduce((sum, host) => sum + (host.weight ?? 100), 0);

  // I need the total amount of all bookings too
  const usersWithBookingShortfalls = availableUsers.map((user) => {
    const targetPercentage = (user.weight ?? 100) / totalWeight;

    const userBookings = bookings.filter(
      (booking) =>
        booking.userId === user.id || booking.attendees.some((attendee) => attendee.email === user.email)
    );

    const targetNumberOfBookings = bookings.length * targetPercentage;

    return {
      ...user,
      bookingShortfall: targetNumberOfBookings - userBookings.length,
    };
  });

  // find the users with the highest booking shortfall
  const maxShortfall = usersWithBookingShortfalls.reduce(
    (max, user) => Math.max(max, user.bookingShortfall),
    0
  );

  const usersWithMaxShortfall = usersWithBookingShortfalls.filter(
    (user) => user.bookingShortfall === maxShortfall
  );

  return usersWithMaxShortfall;
}

// TODO: Configure distributionAlgorithm from the event type configuration
// TODO: Add 'MAXIMIZE_FAIRNESS' algorithm.
export async function getLuckyUser<
  T extends Pick<User, "id" | "email"> & {
    priority?: number | null;
    weight?: number | null;
  }
>(
  distributionAlgorithm: "MAXIMIZE_AVAILABILITY" = "MAXIMIZE_AVAILABILITY",
  {
    availableUsers,
    eventTypeId,
    isRRWeightsEnabled,
    allRRHosts,
  }: { availableUsers: T[]; eventTypeId: number; isRRWeightsEnabled: boolean; allRRHosts: IsFixedAwareUser[] }
) {
  if (availableUsers.length === 1) {
    return availableUsers[0];
  }

  const allBookings = await prisma.booking.findMany({
    where: {
      eventTypeId,
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
      if (isRRWeightsEnabled) {
        possibleLuckyUsers = await getUsersbasedOnWeights({
          availableUsers,
          eventTypeId,
          allBookings,
          allRRHosts,
        });
      }
      const highestPriorityUsers = getUsersWithHighestPriority({ availableUsers: possibleLuckyUsers });
      return leastRecentlyBookedUser<T>({ availableUsers: highestPriorityUsers, eventTypeId, allBookings });
  }
}
