import { Prisma } from "@prisma/client";

import { userSelect } from "@calcom/prisma";

type User = Prisma.UserGetPayload<typeof userSelect>;

export function getLuckyUsers(
  users: User[],
  bookingCounts: {
    username: string | null;
    bookingCount: number;
  }[]
) {
  if (!bookingCounts.length) users.slice(0, 1);

  const [firstMostAvailableUser] = bookingCounts.sort((a, b) => (a.bookingCount > b.bookingCount ? 1 : -1));
  const luckyUser = users.find((user) => user.username === firstMostAvailableUser?.username);
  return luckyUser ? [luckyUser] : users;
}
