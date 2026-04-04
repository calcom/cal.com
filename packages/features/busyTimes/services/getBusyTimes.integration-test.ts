import dayjs from "@calcom/dayjs";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterEach, describe, expect, it } from "vitest";

type CreatedResources = {
  users: number[];
  eventTypes: number[];
  bookings: number[];
};

const createdResources: CreatedResources = {
  users: [],
  eventTypes: [],
  bookings: [],
};

const createTestUser = async (overrides?: { email?: string; username?: string }) => {
  const timestamp = `${Date.now()}-${Math.random()}`;
  const user = await prisma.user.create({
    data: {
      email: overrides?.email ?? `busy-times-${timestamp}@example.com`,
      username: overrides?.username ?? `busy-times-${timestamp}`,
    },
  });
  createdResources.users.push(user.id);
  return user;
};

const createTestEventType = async (userId: number) => {
  const timestamp = `${Date.now()}-${Math.random()}`;
  const eventType = await prisma.eventType.create({
    data: {
      title: "Busy Times Test Event",
      slug: `busy-times-${timestamp}`,
      length: 30,
      userId,
      users: {
        connect: { id: userId },
      },
    },
  });
  createdResources.eventTypes.push(eventType.id);
  return eventType;
};

const createTestBooking = async (params: {
  userId: number;
  eventTypeId: number;
  uid: string;
  startTime: Date;
  endTime: Date;
}) => {
  const booking = await prisma.booking.create({
    data: {
      userId: params.userId,
      eventTypeId: params.eventTypeId,
      uid: params.uid,
      status: BookingStatus.ACCEPTED,
      startTime: params.startTime,
      endTime: params.endTime,
      title: "Busy Times Test Booking",
    },
  });
  createdResources.bookings.push(booking.id);
  return booking;
};

afterEach(async () => {
  if (createdResources.bookings.length > 0) {
    await prisma.booking.deleteMany({
      where: { id: { in: createdResources.bookings } },
    });
    createdResources.bookings = [];
  }

  if (createdResources.eventTypes.length > 0) {
    await prisma.eventType.deleteMany({
      where: { id: { in: createdResources.eventTypes } },
    });
    createdResources.eventTypes = [];
  }

  if (createdResources.users.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdResources.users } },
    });
    createdResources.users = [];
  }
});

describe("getBusyTimesForLimitChecks (integration)", () => {
  it("returns bookings across batches for large user lists", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const eventType = await createTestEventType(user1.id);

    const dayStart = dayjs().add(1, "day").startOf("day");
    const dayEnd = dayStart.endOf("day");

    await createTestBooking({
      userId: user1.id,
      eventTypeId: eventType.id,
      uid: `busy-times-${Date.now()}-1`,
      startTime: dayStart.set("hour", 9).toDate(),
      endTime: dayStart.set("hour", 10).toDate(),
    });

    await createTestBooking({
      userId: user2.id,
      eventTypeId: eventType.id,
      uid: `busy-times-${Date.now()}-2`,
      startTime: dayStart.set("hour", 11).toDate(),
      endTime: dayStart.set("hour", 12).toDate(),
    });

    const fillerIds = Array.from({ length: 58 }, (_, index) => 1_000_000 + index);
    const userIds = [user1.id, ...fillerIds, user2.id];

    const busyTimes = await getBusyTimesService().getBusyTimesForLimitChecks({
      userIds,
      eventTypeId: eventType.id,
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString(),
      bookingLimits: { PER_DAY: 5 },
    });

    expect(busyTimes).toHaveLength(2);
    expect(busyTimes.map((busyTime) => busyTime.userId).sort()).toEqual([user1.id, user2.id].sort());
  });

  it("excludes rescheduleUid from results", async () => {
    const user = await createTestUser();
    const eventType = await createTestEventType(user.id);

    const dayStart = dayjs().add(2, "day").startOf("day");
    const dayEnd = dayStart.endOf("day");
    const rescheduleUid = `busy-times-${Date.now()}-reschedule`;

    await createTestBooking({
      userId: user.id,
      eventTypeId: eventType.id,
      uid: rescheduleUid,
      startTime: dayStart.set("hour", 9).toDate(),
      endTime: dayStart.set("hour", 10).toDate(),
    });

    const busyTimes = await getBusyTimesService().getBusyTimesForLimitChecks({
      userIds: [user.id],
      eventTypeId: eventType.id,
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString(),
      rescheduleUid,
      bookingLimits: { PER_DAY: 5 },
    });

    expect(busyTimes).toHaveLength(0);
  });
});
