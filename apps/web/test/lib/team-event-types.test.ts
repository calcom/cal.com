import { getLuckyUser } from "@calcom/lib/server";
import { buildUser } from "@calcom/lib/test/builder";

import { prismaMock } from "../../../../tests/config/singleton";

it("can find lucky user with maximize availability", async () => {
  const user1 = buildUser({
    id: 1,
    username: "test",
    name: "Test User",
    email: "test@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25"),
      },
    ],
  });
  const user2 = buildUser({
    id: 1,
    username: "test",
    name: "Test User",
    email: "test@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25"),
      },
    ],
  });
  const users = [user1, user2];
  // TODO: we may be able to use native prisma generics somehow?
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.user.findMany.mockResolvedValue(users);

  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: users,
      eventTypeId: 1,
    })
  ).resolves.toStrictEqual(users[1]);
});
