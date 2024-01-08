import type { User } from "@prisma/client";

import prisma from "@calcom/prisma";

async function leastRecentlyBookedUser<T extends Pick<User, "id" | "email">>({
  availableUsers,
  eventTypeId,
}: {
  availableUsers: T[];
  eventTypeId: number;
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

  const bookings = await prisma.booking.findMany({
    where: {
      AND: [
        {
          eventTypeId,
        },
        {
          attendees: {
            some: {
              email: {
                in: availableUsers.map((user) => user.email),
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      createdAt: true,
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

// TODO: Configure distributionAlgorithm from the event type configuration
// TODO: Add 'MAXIMIZE_FAIRNESS' algorithm.
export async function getLuckyUser<T extends Pick<User, "id" | "email">>(
  distributionAlgorithm: "MAXIMIZE_AVAILABILITY" = "MAXIMIZE_AVAILABILITY",
  { availableUsers, eventTypeId }: { availableUsers: T[]; eventTypeId: number }
) {
  if (availableUsers.length === 1) {
    return availableUsers[0];
  }
  switch (distributionAlgorithm) {
    case "MAXIMIZE_AVAILABILITY":
      return leastRecentlyBookedUser<T>({ availableUsers, eventTypeId });
  }
}
