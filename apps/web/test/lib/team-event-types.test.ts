import { UserPlan } from "@prisma/client";

import { getLuckyUsers } from "@calcom/lib";

const baseUser = {
  id: 0,
  username: "test",
  name: "Test User",
  credentials: [],
  timeZone: "GMT",
  bufferTime: 0,
  email: "test@example.com",
  destinationCalendar: null,
  locale: "en",
  theme: null,
  brandColor: "#292929",
  darkBrandColor: "#fafafa",
  availability: [],
  selectedCalendars: [],
  startTime: 0,
  endTime: 0,
  schedules: [],
  defaultScheduleId: null,
  plan: UserPlan.PRO,
  avatar: "",
  hideBranding: true,
};

it("can find lucky users", async () => {
  const users = [
    {
      ...baseUser,
      id: 1,
      username: "test",
      name: "Test User",
      email: "test@example.com",
    },
    {
      ...baseUser,
      id: 2,
      username: "test2",
      name: "Test 2 User",
      email: "test2@example.com",
    },
  ];
  expect(
    getLuckyUsers(users, [
      { username: "test", bookingCount: 2 },
      { username: "test2", bookingCount: 0 },
    ])
  ).toStrictEqual([users[1]]);
});
