import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

const startOfTomorrow = dayjs().add(1, "day").startOf("day");
const tomorrowDate = startOfTomorrow.format("YYYY-MM-DD");

const mockBookings = ({
  beforeEventBuffer = 0,
  afterEventBuffer = 0,
  seatsPerTimeSlot,
}: {
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  seatsPerTimeSlot?: number;
}) => [
  {
    id: 1,
    startTime: startOfTomorrow.set("hour", 10).toDate(),
    endTime: startOfTomorrow.set("hour", 11).toDate(),
    title: "Booking Between X and Y",
    userId: 1,
    uid: "xxxx1",
    eventType: {
      id: 1,
      beforeEventBuffer,
      afterEventBuffer,
      seatsPerTimeSlot: seatsPerTimeSlot ?? null,
    },
    _count: {
      seatsReferences: 1,
    },
  },
  {
    id: 2,
    startTime: startOfTomorrow.set("hour", 14).toDate(),
    endTime: startOfTomorrow.set("hour", 15).toDate(),
    title: "Booking Between X and Y",
    userId: 1,
    uid: "xxxx2",
    eventType: {
      id: 1,
      beforeEventBuffer,
      afterEventBuffer,
      seatsPerTimeSlot: seatsPerTimeSlot ?? null,
    },
    ...(seatsPerTimeSlot
      ? {
          _count: {
            seatsReferences: 1,
          },
        }
      : {}),
  },
];

describe("getBusyTimes", () => {
  it("blocks a regular time slot", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: mockBookings({}),
    });
    expect(busyTimes).toEqual([
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 10).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 11).toDate(),
        source: "eventType-1-booking-1",
        title: "Booking Between X and Y",
      }),
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 14).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 15).toDate(),
        source: "eventType-1-booking-2",
        title: "Booking Between X and Y",
      }),
    ]);
  });
  it("should block before and after buffer times", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: [mockBookings({ beforeEventBuffer: 10 })[0]],
    });
    expect(busyTimes).toEqual([
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 9).set("minute", 50).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 11).toDate(),
        source: "eventType-1-booking-1",
        title: "Booking Between X and Y",
      }),
    ]);
  });
  it("should have busy times only if seated with remaining seats when buffers exist", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      eventTypeId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: [mockBookings({ beforeEventBuffer: 10, seatsPerTimeSlot: 10 })[0]],
    });
    expect(busyTimes).toEqual([
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 9).set("minute", 50).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 10).toDate(),
      }),
    ]);
  });

  // Buffer times bug fix
  it("should correctly apply afterEventBuffer to block time after booking", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: [mockBookings({ afterEventBuffer: 30 })[0]],
    });
    expect(busyTimes).toEqual([
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 10).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 11).set("minute", 30).toDate(),
        source: "eventType-1-booking-1",
        title: "Booking Between X and Y",
      }),
    ]);
  });

  it("should correctly apply beforeEventBuffer to block time before booking", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: [mockBookings({ beforeEventBuffer: 20 })[0]],
    });
    expect(busyTimes).toEqual([
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 9).set("minute", 40).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 11).toDate(),
        source: "eventType-1-booking-1",
        title: "Booking Between X and Y",
      }),
    ]);
  });

  it("should correctly apply both beforeEventBuffer and afterEventBuffer", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: [mockBookings({ beforeEventBuffer: 15, afterEventBuffer: 30 })[0]],
    });
    expect(busyTimes).toEqual([
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 9).set("minute", 45).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 11).set("minute", 30).toDate(),
        source: "eventType-1-booking-1",
        title: "Booking Between X and Y",
      }),
    ]);
  });

  it("should apply afterEventBuffer correctly for multiple bookings", async () => {
    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "exampleuser1@example.com",
      username: "exampleuser1",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: mockBookings({ afterEventBuffer: 30 }),
    });
    expect(busyTimes).toHaveLength(2);
    expect(busyTimes[0]).toEqual(
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 10).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 11).set("minute", 30).toDate(),
      })
    );
    expect(busyTimes[1]).toEqual(
      expect.objectContaining({
        start: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 14).toDate(),
        end: dayjs(`${tomorrowDate}`).startOf("day").set("hour", 15).set("minute", 30).toDate(),
      })
    );
  });
});
