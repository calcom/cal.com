/**
 *  This script can be used to seed the database with a lot of data for performance testing.
 *  TODO: Make it more structured and configurable from CLI
 *  Run it as `npx ts-node --transpile-only ./seed-performance-testing.ts`
 */
import { uuid } from "short-uuid";

import dailyMeta from "@calcom/app-store/dailyvideo/_metadata";
import googleMeetMeta from "@calcom/app-store/googlevideo/_metadata";
import zoomMeta from "@calcom/app-store/zoomvideo/_metadata";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

import { createUserAndEventType } from "./seed-utils";

async function _createManyDifferentUsersWithDifferentEventTypesAndBookings({
  tillUser,
  startFrom = 0,
}: {
  tillUser: number;
  startFrom?: number;
}) {
  for (let i = startFrom; i < tillUser; i++) {
    await createUserAndEventType({
      user: {
        email: `pro${i}@example.com`,
        name: "Pro Example",
        password: "1111",
        username: `pro${i}`,
        theme: "light",
      },
      eventTypes: [
        {
          title: "30min",
          slug: "30min",
          length: 30,
          _bookings: [
            {
              uid: uuid(),
              title: "30min",
              startTime: dayjs().add(1, "day").toDate(),
              endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
            },
            {
              uid: uuid(),
              title: "30min",
              startTime: dayjs().add(2, "day").toDate(),
              endTime: dayjs().add(2, "day").add(30, "minutes").toDate(),
              status: BookingStatus.PENDING,
            },
          ],
        },
        {
          title: "60min",
          slug: "60min",
          length: 60,
        },
        {
          title: "Multiple duration",
          slug: "multiple-duration",
          length: 75,
          metadata: {
            multipleDuration: [30, 75, 90],
          },
        },
        {
          title: "paid",
          slug: "paid",
          length: 60,
          price: 100,
        },
        {
          title: "In person meeting",
          slug: "in-person",
          length: 60,
          locations: [{ type: "inPerson", address: "London" }],
        },
        {
          title: "Zoom Event",
          slug: "zoom",
          length: 60,
          locations: [{ type: zoomMeta.appData?.location?.type }],
        },
        {
          title: "Daily Event",
          slug: "daily",
          length: 60,
          locations: [{ type: dailyMeta.appData?.location?.type }],
        },
        {
          title: "Google Meet",
          slug: "google-meet",
          length: 60,
          locations: [{ type: googleMeetMeta.appData?.location?.type }],
        },
        {
          title: "Yoga class",
          slug: "yoga-class",
          length: 30,
          recurringEvent: { freq: 2, count: 12, interval: 1 },
          _bookings: [
            {
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").toDate(),
              endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").add(1, "week").toDate(),
              endTime: dayjs().add(1, "day").add(1, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").add(2, "week").toDate(),
              endTime: dayjs().add(1, "day").add(2, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").add(3, "week").toDate(),
              endTime: dayjs().add(1, "day").add(3, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").add(4, "week").toDate(),
              endTime: dayjs().add(1, "day").add(4, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").add(5, "week").toDate(),
              endTime: dayjs().add(1, "day").add(5, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Seeded Yoga class",
              description: "seeded",
              recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
              startTime: dayjs().subtract(4, "day").toDate(),
              endTime: dayjs().subtract(4, "day").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Seeded Yoga class",
              description: "seeded",
              recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
              startTime: dayjs().subtract(4, "day").add(1, "week").toDate(),
              endTime: dayjs().subtract(4, "day").add(1, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Seeded Yoga class",
              description: "seeded",
              recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
              startTime: dayjs().subtract(4, "day").add(2, "week").toDate(),
              endTime: dayjs().subtract(4, "day").add(2, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
            {
              uid: uuid(),
              title: "Seeded Yoga class",
              description: "seeded",
              recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
              startTime: dayjs().subtract(4, "day").add(3, "week").toDate(),
              endTime: dayjs().subtract(4, "day").add(3, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            },
          ],
        },
        {
          title: "Tennis class",
          slug: "tennis-class",
          length: 60,
          recurringEvent: { freq: 2, count: 10, interval: 2 },
          requiresConfirmation: true,
          _bookings: [
            {
              uid: uuid(),
              title: "Tennis class",
              recurringEventId: Buffer.from("tennis-class").toString("base64"),
              startTime: dayjs().add(2, "day").toDate(),
              endTime: dayjs().add(2, "day").add(60, "minutes").toDate(),
              status: BookingStatus.PENDING,
            },
            {
              uid: uuid(),
              title: "Tennis class",
              recurringEventId: Buffer.from("tennis-class").toString("base64"),
              startTime: dayjs().add(2, "day").add(2, "week").toDate(),
              endTime: dayjs().add(2, "day").add(2, "week").add(60, "minutes").toDate(),
              status: BookingStatus.PENDING,
            },
            {
              uid: uuid(),
              title: "Tennis class",
              recurringEventId: Buffer.from("tennis-class").toString("base64"),
              startTime: dayjs().add(2, "day").add(4, "week").toDate(),
              endTime: dayjs().add(2, "day").add(4, "week").add(60, "minutes").toDate(),
              status: BookingStatus.PENDING,
            },
            {
              uid: uuid(),
              title: "Tennis class",
              recurringEventId: Buffer.from("tennis-class").toString("base64"),
              startTime: dayjs().add(2, "day").add(8, "week").toDate(),
              endTime: dayjs().add(2, "day").add(8, "week").add(60, "minutes").toDate(),
              status: BookingStatus.PENDING,
            },
            {
              uid: uuid(),
              title: "Tennis class",
              recurringEventId: Buffer.from("tennis-class").toString("base64"),
              startTime: dayjs().add(2, "day").add(10, "week").toDate(),
              endTime: dayjs().add(2, "day").add(10, "week").add(60, "minutes").toDate(),
              status: BookingStatus.PENDING,
            },
          ],
        },
      ],
    });
  }
}

async function createAUserWithManyBookings() {
  const random = Math.random();
  await createUserAndEventType({
    user: {
      email: `pro-${random}@example.com`,
      name: "Pro Example",
      password: "1111",
      username: `pro-${random}`,
      theme: "light",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        _numBookings: 100,
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
        _numBookings: 100,
      },
      {
        title: "Multiple duration",
        slug: "multiple-duration",
        length: 75,
        metadata: {
          multipleDuration: [30, 75, 90],
        },
        _numBookings: 100,
      },
      {
        title: "paid",
        slug: "paid",
        length: 60,
        price: 100,
        _numBookings: 100,
      },
      {
        title: "Zoom Event",
        slug: "zoom",
        length: 60,
        locations: [{ type: zoomMeta.appData?.location?.type }],
        _numBookings: 100,
      },
      {
        title: "Daily Event",
        slug: "daily",
        length: 60,
        locations: [{ type: dailyMeta.appData?.location?.type }],
        _numBookings: 100,
      },
      {
        title: "Google Meet",
        slug: "google-meet",
        length: 60,
        locations: [{ type: googleMeetMeta.appData?.location?.type }],
        _numBookings: 100,
      },
      {
        title: "Yoga class",
        slug: "yoga-class",
        length: 30,
        _numBookings: 100,
      },
      {
        title: "Tennis class",
        slug: "tennis-class",
        length: 60,
        recurringEvent: { freq: 2, count: 10, interval: 2 },
        requiresConfirmation: true,
        _numBookings: 100,
      },
    ],
  });
}

// createManyDifferentUsersWithDifferentEventTypesAndBookings({
//   tillUser: 20000,
//   startFrom: 10000,
// });

createAUserWithManyBookings();
