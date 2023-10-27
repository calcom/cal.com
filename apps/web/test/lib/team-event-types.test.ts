import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { expect, it } from "vitest";

import { getLuckyUser } from "@calcom/lib/server";
import { buildUser } from "@calcom/lib/test/builder";

it("can find lucky user with maximize availability", async () => {
  const user1 = buildUser({
    id: 1,
    username: "test",
    name: "Test User",
    email: "test@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25T05:30:00.000Z"),
      },
      {
        createdAt: new Date("2022-01-25T06:30:00.000Z"),
      },
    ],
  });
  const user2 = buildUser({
    id: 2,
    username: "test2",
    name: "Test User 2",
    email: "tes2t@example.com",
    bookings: [
      {
        createdAt: new Date("2022-01-25T04:30:00.000Z"),
      },
    ],
  });
  const users = [user1, user2];
  // TODO: we may be able to use native prisma generics somehow?
  prismaMock.user.findMany.mockResolvedValue(users);
  prismaMock.booking.findMany.mockResolvedValue([]);

  await expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: users,
      eventTypeId: 1,
    })
  ).resolves.toStrictEqual(users[1]);
});
