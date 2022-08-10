import { Prisma } from "@prisma/client";

import { userSelect } from "@calcom/prisma";

type User = Prisma.UserGetPayload<typeof userSelect>;

async function leastRecentlyBookedUser({
  availableUsers,
  eventTypeId,
}: {
  availableUsers: User[];
  eventTypeId: number;
}) {
  const usersWithLastCreated = await prisma?.user.findMany({
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
      keyValuePair[user.id] = user.bookings[0]?.createdAt;
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
export async function getLuckyUser(
  distributionAlgorithm: "MAXIMIZE_AVAILABILITY" = "MAXIMIZE_AVAILABILITY",
  { availableUsers, eventTypeId }: { availableUsers: User[]; eventTypeId: number }
) {
  if (availableUsers.length === 1) {
    return availableUsers[0];
  }
  switch (distributionAlgorithm) {
    case "MAXIMIZE_AVAILABILITY":
      return leastRecentlyBookedUser({ availableUsers, eventTypeId });
  }
}
