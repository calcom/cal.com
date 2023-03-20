import { User } from "@prisma/client";

import prisma from "@calcom/prisma";

async function leastRecentlyBookedUser<T extends Pick<User, "id">>({
  availableUsers,
  eventTypeId,
}: {
  availableUsers: T[];
  eventTypeId: number;
}) {
  const usersWithLastCreated = await prisma.user.findMany({
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

  if (!usersWithLastCreated) {
    throw new Error("Unable to find users by availableUser ids."); // should never happen.
  }

  const userIdAndAtCreatedPair = usersWithLastCreated.reduce(
    (keyValuePair: { [key: number]: Date }, user) => {
      keyValuePair[user.id] = user.bookings[0]?.createdAt || new Date(0);
      return keyValuePair;
    },
    {}
  );

  const leastRecentlyBookedUser = availableUsers.sort((a, b) => {
    return userIdAndAtCreatedPair[a.id] > userIdAndAtCreatedPair[b.id] ? 1 : -1;
  })[0];

  return leastRecentlyBookedUser;
}

// TODO: Configure distributionAlgorithm from the event type configuration
// TODO: Add 'MAXIMIZE_FAIRNESS' algorithm.
export async function getLuckyUser<T extends Pick<User, "id">>(
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
