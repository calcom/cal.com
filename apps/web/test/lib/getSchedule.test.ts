import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

import prisma from "@calcom/prisma";

import { getSchedule } from "../../server/routers/viewer/slots";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

jest.mock("@calcom/prisma", () => {
  return mockDeep<PrismaClient>();
});

beforeEach(() => mockReset(prismaMock));

test.only("getSchedule without calendar credentials", async () => {
  /**
   * await prisma.eventType.findUnique({
    where: {
      id: input.eventTypeId,
    },
    select: {
      id: true,
      minimumBookingNotice: true,
      length: true,
      seatsPerTimeSlot: true,
      timeZone: true,
      slotInterval: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      schedulingType: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      periodDays: true,
      schedule: {
        select: {
          availability: true,
          timeZone: true,
        },
      },
      availability: {
        select: {
          startTime: true,
          endTime: true,
          days: true,
        },
      },
      users: {
        select: {
          username: true,
          credentials: true,
          timeZone: true,
          bufferTime: true,
          availability: true,
          id: true,
          startTime: true,
          endTime: true,
          selectedCalendars: true,
          schedules: {
            select: {
              availability: true,
              timeZone: true,
              id: true,
            },
          },
          defaultScheduleId: true,
        },
      },
    },
  });
   */
  prismaMock.eventType.findUnique.mockResolvedValue({
    id: 12,
    minimumBookingNotice: 1440,
    length: 30,
    seatsPerTimeSlot: null,
    timeZone: null,
    slotInterval: 45,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,
    periodType: "UNLIMITED",
    periodStartDate: "2022-01-21T09:03:48.000Z",
    periodEndDate: "2022-01-21T09:03:48.000Z",
    periodCountCalendarDays: false,
    periodDays: 30,
    schedule: null,
    availability: [],
    users: [
      {
        username: "hariom",
        // credentials: [
        //   {
        //     id: 21519,
        //     type: "google_calendar",
        //     key: {
        //       scope:
        //         "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
        //       token_type: "Bearer",
        //       expiry_date: 1656999025367,
        //       access_token:
        //         "ACCESS_TOKEN",
        //       refresh_token:
        //         "REFRESH_TOKEN",
        //     },
        //     userId: 12244,
        //     appId: "google-calendar",
        //   },
        // ],
        credentials: [],
        timeZone: "Asia/Kolkata",
        bufferTime: 0,
        availability: [],
        id: 12244,
        startTime: 0,
        endTime: 1440,
        selectedCalendars: [
          {
            userId: 12244,
            integration: "google_calendar",
            externalId: "hariombalhara@gmail.com",
          },
          {
            userId: 12244,
            integration: "google_calendar",
            externalId: "hariom@eventengage.io",
          },
        ],
        schedules: [
          {
            availability: [
              {
                id: 44075,
                userId: null,
                eventTypeId: null,
                days: [1, 2, 3, 4, 5],
                startTime: "1970-01-01T09:30:00.000Z",
                endTime: "1970-01-01T18:00:00.000Z",
                date: null,
                scheduleId: 4752,
              },
            ],
            timeZone: "Asia/Kolkata",
            id: 4752,
          },
        ],
        defaultScheduleId: 4752,
      },
    ],
  });

  /**
   * await prisma.booking.findMany({
    where: {
      eventTypeId: 36837,
    },
    select: {
      uid: true,
      startTime: true,
      _count: {
        select: {
          attendees: true,
        },
      },
    },
  });
   */
  prismaMock.booking.findMany.mockResolvedValue([
    {
      uid: "hhLZJ3ZZSxeuJxBbm8HBpj",
      startTime: "2022-01-21T11:30:00.000Z",
      _count: {
        attendees: 1,
      },
    },
    {
      uid: "1AM7FD8utZV9CxJz5uS59r",
      startTime: "2022-01-29T14:30:00.000Z",
      _count: {
        attendees: 1,
      },
    },
  ]);

  const schedule = await getSchedule({
    eventTypeId: 36837,
    startTime: "2022-07-10T18:30:00.000Z",
    endTime: "2022-07-11T18:29:59.999Z",
    timeZone: "Asia/Kolkata",
  });
  expect(schedule.slots["2022-07-11"].map((slot) => slot.time)).toEqual([
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
});
