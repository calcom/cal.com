/**
 *  This script can be used to seed the database with a lot of data for performance testing.
 */
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

import { uuid } from "short-uuid";
 
import dailyMeta from "@calcom/app-store/dailyvideo/_metadata";
import googleMeetMeta from "@calcom/app-store/googlevideo/_metadata";
import zoomMeta from "@calcom/app-store/zoomvideo/_metadata";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
 
import { createUserAndEventType } from "./seed-utils";

type Mode = "many-bookings" | "many-users";
 
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
 
  const mode = (get("--mode") ?? "many-bookings") as Mode;
  const bookingsPerEventType = parseInt(get("--bookings") ?? "100", 10);
  const startFrom = parseInt(get("--start-from") ?? "0", 10);
  const tillUser = parseInt(get("--till-user") ?? "20", 10);

  if (!["many-bookings", "many-users"].includes(mode)) {
    console.error(`Invalid --mode "${mode}". Must be many-bookings or many-users.`);
    process.exit(1);
  }

  const config = { mode, bookingsPerEventType, startFrom, tillUser };

  return config;
}
 
async function createManyDifferentUsersWithDifferentEventTypesAndBookings({
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
        { title: "60min", slug: "60min", length: 60 },
        {
          title: "Multiple duration",
          slug: "multiple-duration",
          length: 75,
          metadata: { multipleDuration: [30, 75, 90] },
        },
        { title: "paid", slug: "paid", length: 60, price: 100 },
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
            ...[0, 1, 2, 3, 4, 5].map((week) => ({
              uid: uuid(),
              title: "Yoga class",
              recurringEventId: Buffer.from("yoga-class").toString("base64"),
              startTime: dayjs().add(1, "day").add(week, "week").toDate(),
              endTime: dayjs().add(1, "day").add(week, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            })),
            ...[0, 1, 2, 3].map((week) => ({
              uid: uuid(),
              title: "Seeded Yoga class",
              description: "seeded",
              recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
              startTime: dayjs().subtract(4, "day").add(week, "week").toDate(),
              endTime: dayjs().subtract(4, "day").add(week, "week").add(30, "minutes").toDate(),
              status: BookingStatus.ACCEPTED,
            })),
          ],
        },
        {
          title: "Tennis class",
          slug: "tennis-class",
          length: 60,
          recurringEvent: { freq: 2, count: 10, interval: 2 },
          requiresConfirmation: true,
          _bookings: [0, 2, 4, 8, 10].map((week) => ({
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(week, "week").toDate(),
            endTime: dayjs().add(2, "day").add(week, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          })),
        },
      ],
    });
  }
}

async function createAUserWithManyBookings(bookingsPerEventType: number) {
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
      { title: "30min", slug: "30min", length: 30, _numBookings: bookingsPerEventType },
      { title: "60min", slug: "60min", length: 60, _numBookings: bookingsPerEventType },
      {
        title: "Multiple duration",
        slug: "multiple-duration",
        length: 75,
        metadata: { multipleDuration: [30, 75, 90] },
        _numBookings: bookingsPerEventType,
      },
      { title: "paid", slug: "paid", length: 60, price: 100, _numBookings: bookingsPerEventType },
      {
        title: "Zoom Event",
        slug: "zoom",
        length: 60,
        locations: [{ type: zoomMeta.appData?.location?.type }],
        _numBookings: bookingsPerEventType,
      },
      {
        title: "Daily Event",
        slug: "daily",
        length: 60,
        locations: [{ type: dailyMeta.appData?.location?.type }],
        _numBookings: bookingsPerEventType,
      },
      {
        title: "Google Meet",
        slug: "google-meet",
        length: 60,
        locations: [{ type: googleMeetMeta.appData?.location?.type }],
        _numBookings: bookingsPerEventType,
      },
      { title: "Yoga class", slug: "yoga-class", length: 30, _numBookings: bookingsPerEventType },
      {
        title: "Tennis class",
        slug: "tennis-class",
        length: 60,
        recurringEvent: { freq: 2, count: 10, interval: 2 },
        requiresConfirmation: true,
        _numBookings: bookingsPerEventType,
      },
    ],
  });
}

async function main() {
  const { mode, bookingsPerEventType, startFrom, tillUser } = parseArgs();
 
  if (mode === "many-users") {
    await createManyDifferentUsersWithDifferentEventTypesAndBookings({ startFrom, tillUser });
  } else {
    await createAUserWithManyBookings(bookingsPerEventType);
  }
}
 
main();
 

