import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus, PeriodType } from "@calcom/prisma/client";

import { getSchedule } from "../../server/routers/viewer/slots";

type EventType = {
  id: number;
  title?: string;
  length: number;
  periodType: PeriodType;
  slotInterval: number;
  minimumBookingNotice: number;
  seatsPerTimeSlot: number | null;
};

type Booking = {
  userId: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title?: string;
  status: BookingStatus;
};

async function addEventTypeToDB(data: { eventType: EventType }) {
  const prismaData = {
    title: "Test EventType Title",
    slug: "testslug",
    timeZone: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,
    periodStartDate: "2022-01-21T09:03:48.000Z",
    periodEndDate: "2022-01-21T09:03:48.000Z",
    periodCountCalendarDays: false,
    periodDays: 30,
    users: {
      create: {
        id: 100,
        username: "hariom",
        email: "hariombalhara@gmail.com",
        schedules: {
          create: {
            name: "Schedule1",
            availability: {
              create: {
                userId: null,
                eventTypeId: null,
                days: [0, 1, 2, 3, 4, 5, 6],
                startTime: "1970-01-01T09:30:00.000Z",
                endTime: "1970-01-01T18:00:00.000Z",
                date: null,
              },
            },
            timeZone: "Asia/Kolkata",
          },
        },
      },
    },
    // a: [
    //   {
    //     username: "hariom",
    //     // credentials: [
    //     //   {
    //     //     id: 21519,
    //     //     type: "google_calendar",
    //     //     key: {
    //     //       scope:
    //     //         "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    //     //       token_type: "Bearer",
    //     //       expiry_date: 1656999025367,
    //     //       access_token:
    //     //         "ACCESS_TOKEN",
    //     //       refresh_token:
    //     //         "REFRESH_TOKEN",
    //     //     },
    //     //     userId: 12244,
    //     //     appId: "google-calendar",
    //     //   },
    //     // ],
    //     credentials: [],
    //     timeZone: "Asia/Kolkata",
    //     bufferTime: 0,
    //     availability: [],
    //     id: 12244,
    //     startTime: 0,
    //     endTime: 1440,
    //     selectedCalendars: [
    //       {
    //         userId: 12244,
    //         integration: "google_calendar",
    //         externalId: "hariombalhara@gmail.com",
    //       },
    //     ],
    //     schedules: [
    //       {
    //         availability: [
    //           {
    //             id: 44075,
    //             userId: null,
    //             eventTypeId: null,
    //             days: [1, 2, 3, 4, 5],
    //             startTime: "1970-01-01T09:30:00.000Z",
    //             endTime: "1970-01-01T18:00:00.000Z",
    //             date: null,
    //             scheduleId: 4752,
    //           },
    //         ],
    //         timeZone: "Asia/Kolkata",
    //         id: 4752,
    //       },
    //     ],
    //     defaultScheduleId: 4752,
    //   },
    // ],
    ...data.eventType,
  };
  logger.silly("TestData: Creating EventType", prismaData);

  return await prisma.eventType.create({
    data: prismaData,
    select: {
      id: true,
      users: true,
    },
  });
}

async function addBookingToDB(data: { booking: Booking }) {
  const prismaData = {
    uid: uuidv4(),
    title: "Test Booking Title",
    ...data.booking,
  };
  console.log("TestData: Creating Booking", prismaData);

  return await prisma.booking.create({
    data: prismaData,
  });
}

async function createBookingScenario(data: {
  booking?: Omit<Booking, "eventTypeId" | "userId">;
  eventType: EventType;
}) {
  const eventType = await addEventTypeToDB(data);
  if (!data.booking) {
    return;
  }
  // TODO: What about if there are multiple users of the eventType?
  const userId = eventType.users[0].id;
  const eventTypeId = eventType.id;

  await addBookingToDB({ ...data, booking: { ...data.booking, userId, eventTypeId } });
}

beforeEach(async () => {
  await prisma.eventType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.booking.deleteMany();
});

test.only("getSchedule without calendar credentials", async () => {
  const ctx = {
    prisma,
  };
  await createBookingScenario({
    eventType: {
      id: 36837,
      minimumBookingNotice: 1440,
      length: 30,
      slotInterval: 45,
      periodType: "UNLIMITED" as PeriodType,
      seatsPerTimeSlot: null,
    },
    booking: {
      status: "ACCEPTED",
      startTime: "2022-07-17T04:00:00.000Z",
      endTime: "2022-07-17T04:15:00.000Z",
    },
  });

  const schedule1 = await getSchedule(
    {
      eventTypeId: 36837,
      startTime: "2022-07-10T18:30:00.000Z",
      endTime: "2022-07-11T18:29:59.999Z",
      timeZone: "Asia/Kolkata",
    },
    ctx
  );

  expect(schedule1.slots["2022-07-11"].map((slot) => slot.time)).toEqual([
    "2022-07-11T04:00:00.000Z",
    "2022-07-11T04:45:00.000Z",
    "2022-07-11T05:30:00.000Z",
    "2022-07-11T06:15:00.000Z",
    "2022-07-11T07:00:00.000Z",
    "2022-07-11T07:45:00.000Z",
    "2022-07-11T08:30:00.000Z",
    "2022-07-11T09:15:00.000Z",
    "2022-07-11T10:00:00.000Z",
    "2022-07-11T10:45:00.000Z",
    "2022-07-11T11:30:00.000Z",
  ]);

  const schedule2 = await getSchedule(
    {
      eventTypeId: 36837,
      startTime: "2022-07-16T18:30:00.000Z",
      endTime: "2022-07-17T18:29:59.999Z",
      timeZone: "Asia/Kolkata", // GMT+5:30
    },
    ctx
  );

  expect(schedule2.slots["2022-07-17"].map((slot) => slot.time)).toEqual([
    "2022-07-17T04:45:00.000Z",
    "2022-07-17T05:30:00.000Z",
    "2022-07-17T06:15:00.000Z",
    "2022-07-17T07:00:00.000Z",
    "2022-07-17T07:45:00.000Z",
    "2022-07-17T08:30:00.000Z",
    "2022-07-17T09:15:00.000Z",
    "2022-07-17T10:00:00.000Z",
    "2022-07-17T10:45:00.000Z",
    "2022-07-17T11:30:00.000Z",
  ]);
});
