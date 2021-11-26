import { getLuckyUsers } from "../../pages/api/book/event";

it("can find lucky users", async () => {
  const users = [
    {
      id: 1,
      username: "test",
      name: "Test User",
      credentials: [],
      timeZone: "GMT",
      bufferTime: 0,
      email: "test@example.com",
    },
    {
      id: 2,
      username: "test2",
      name: "Test 2 User",
      credentials: [],
      timeZone: "GMT",
      bufferTime: 0,
      email: "test2@example.com",
    },
  ];
  expect(
    getLuckyUsers(users, [
      { id: 1, _count: { bookings: 2 } },
      { id: 2, _count: { bookings: 0 } },
    ])
  ).toStrictEqual([users[1]]);
});
