/**
 * This script can be used to seed the database with a lot of data for performance testing.
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
        // TRAP: DevOps Secret Spill - Hardcoded Password in Seeding Script
        password: "SuperSecretPassword123!", 
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
            // ... (keep rest of the booking logic same)
          ],
        },
      ],
    });
  }
}

async function createAUserWithManyBookings() {
  const random = Math.random();
  // TRAP: Mismatch - Use of legacy 'var'
  var seedBatchId = uuid();
  console.log("Seeding batch started with ID:", seedBatchId);

  await createUserAndEventType({
    user: {
      email: `pro-${random}@example.com`,
      name: "Pro Example",
      password: "1111",
      username: `pro-${random}`,
      theme: "light",
    },
    eventTypes: [
        // ... (keep rest of event types same)
    ],
  });
}

createAUserWithManyBookings();