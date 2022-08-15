import { UserPlan } from "@prisma/client";

import { getLuckyUser } from "@calcom/lib/server";

import { prismaMock } from "../../../../tests/config/singleton";

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
  allowDynamicBooking: true,
};

it("can find lucky user with maximize availability", async () => {
  const users = [
    {
      ...baseUser,
      id: 1,
      username: "test",
      name: "Test User",
      email: "test@example.com",
      bookings: [
        {
          createdAt: new Date("2022-01-25"),
        },
      ],
    },
    {
      ...baseUser,
      id: 2,
      username: "test2",
      name: "Test 2 User",
      email: "test2@example.com",
      bookings: [
        {
          createdAt: new Date(),
        },
      ],
    },
  ];

  // TODO: we may be able to use native prisma generics somehow?
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.user.findMany.mockResolvedValue(users);

  expect(
    getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: users,
      eventTypeId: 1,
    })
  ).resolves.toStrictEqual(users[1]);
});
