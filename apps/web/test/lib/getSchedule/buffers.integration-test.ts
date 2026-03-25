import { afterAll, beforeAll, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import { expect } from "./expects";

describe("getSchedule buffers (integration)", () => {
  let user: User;
  let schedule: Schedule;
  let eventType: EventType;
  const createdBookingIds: number[] = [];
  const timestamp = Date.now();

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    user = await prisma.user.create({
      data: {
        username: `buffer-test-user-${timestamp}`,
        name: "Buffer Test User",
        email: `buffer-test-user-${timestamp}@example.com`,
      },
    });

    schedule = await prisma.schedule.create({
      data: {
        name: `Buffer Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "UTC",
      },
    });

    await prisma.availability.create({
      data: {
        scheduleId: schedule.id,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T17:00:00.000Z"),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultScheduleId: schedule.id },
    });

    // 30-min event with 15-min before buffer, 30-min after buffer.
    eventType = await prisma.eventType.create({
      data: {
        title: `Buffer Same Type ${timestamp}`,
        slug: `buffer-same-type-${timestamp}`,
        length: 30,
        slotInterval: 15,
        userId: user.id,
        beforeEventBuffer: 15,
        afterEventBuffer: 30,
        users: { connect: [{ id: user.id }] },
      },
    });

    const [booking1, booking2] = await Promise.all([
      // Booking ending at 13:00
      prisma.booking.create({
        data: {
          uid: `buffer-same-booking-1-${timestamp}`,
          title: "Morning meeting",
          status: BookingStatus.ACCEPTED,
          userId: user.id,
          eventTypeId: eventType.id,
          startTime: new Date("2026-04-10T12:30:00.000Z"),
          endTime: new Date("2026-04-10T13:00:00.000Z"),
        },
      }),
      // Booking starting at 14:30
      prisma.booking.create({
        data: {
          uid: `buffer-same-booking-2-${timestamp}`,
          title: "Afternoon meeting",
          status: BookingStatus.ACCEPTED,
          userId: user.id,
          eventTypeId: eventType.id,
          startTime: new Date("2026-04-10T14:30:00.000Z"),
          endTime: new Date("2026-04-10T15:00:00.000Z"),
        },
      }),
    ]);

    createdBookingIds.push(booking1.id, booking2.id);
  });

  afterAll(async () => {
    vi.useRealTimers();
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
    }
    if (eventType?.id) {
      await prisma.eventType.delete({
        where: { id: eventType.id },
      });
    }
    await prisma.availability.deleteMany({
      where: { scheduleId: schedule?.id },
    });
    if (schedule?.id) {
      await prisma.schedule.delete({
        where: { id: schedule.id },
      });
    }
    if (user?.id) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
  });

  // Scenario from customer query:
  // 30-min event with 15-min before buffer, 30-min after buffer.
  // Booked until 13:00, next booking at 14:30 → 90 min gap.
  // Total footprint: 15 + 30 + 30 = 75 min → naively should fit.
  //
  // But cross-buffer math (same event type, so buffers are additive):
  //   After 13:00 booking: blocked until 13:00 + existing.after(30) + new.before(15) = 13:45
  //   Before 14:30 booking: blocked from 14:30 - (existing.before(15) + new.after(30)) = 13:45
  //   Free window: 13:45–13:45 = 0 min → NO slot fits
  //
  // This demonstrates the cross-buffer doubling effect for same event types.
  test("cross-buffer doubles buffers for same event type, blocking a 90-min gap for a 75-min footprint", async () => {
    vi.setSystemTime("2026-04-01T00:00:00Z");
    const dateString = "2026-04-10";

    const availableSlotsService = getAvailableSlotsService();
    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${dateString}T00:00:00.000Z`,
        endTime: `${dateString}T23:59:59.999Z`,
        timeZone: "UTC",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    // No slots should exist in the 13:00-14:30 gap
    const slots = schedule.slots[dateString] || [];
    const slotTimes = slots.map((s) => s.time);

    const slotsInGap = slotTimes.filter((time) => {
      const hour = new Date(time).getUTCHours();
      const min = new Date(time).getUTCMinutes();
      const totalMin = hour * 60 + min;
      // 13:00 = 780, 14:30 = 870
      return totalMin >= 780 && totalMin < 870;
    });

    expect(slotsInGap).toEqual([]);
  });
});
