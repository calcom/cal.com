import type { IncomingMessage } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, User } from "@calcom/prisma/client";
import type { GetScheduleOptions } from "@calcom/trpc/server/routers/viewer/slots/types";

import { expect } from "./expects";

describe("getSchedule selectedSlots (integration)", () => {
  let user: User;
  let schedule: Schedule;
  let eventType: EventType;
  let seatedEventType: EventType;
  let secondEventType: EventType;
  const timestamp = Date.now();
  const createdSlotIds: number[] = [];

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    user = await prisma.user.create({
      data: {
        username: `slots-test-user-${timestamp}`,
        name: "Slots Test User",
        email: `slots-test-user-${timestamp}@example.com`,
        timeZone: "Asia/Kolkata",
      },
    });

    schedule = await prisma.schedule.create({
      data: {
        name: `Slots Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "Asia/Kolkata",
      },
    });

    await prisma.availability.create({
      data: {
        scheduleId: schedule.id,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T09:30:00.000Z"),
        endTime: new Date("1970-01-01T17:30:00.000Z"),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultScheduleId: schedule.id },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Slots Event ${timestamp}`,
        slug: `slots-event-${timestamp}`,
        length: 45,
        slotInterval: 45,
        userId: user.id,
        users: { connect: [{ id: user.id }] },
      },
    });

    seatedEventType = await prisma.eventType.create({
      data: {
        title: `Seated Event ${timestamp}`,
        slug: `seated-event-${timestamp}`,
        length: 45,
        slotInterval: 45,
        seatsPerTimeSlot: 5,
        userId: user.id,
        users: { connect: [{ id: user.id }] },
      },
    });

    secondEventType = await prisma.eventType.create({
      data: {
        title: `Second Event ${timestamp}`,
        slug: `second-event-${timestamp}`,
        length: 45,
        slotInterval: 45,
        userId: user.id,
        users: { connect: [{ id: user.id }] },
      },
    });
  });

  beforeEach(async () => {
    await prisma.selectedSlots.deleteMany({
      where: { userId: user.id },
    });
    createdSlotIds.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.selectedSlots.deleteMany({ where: { userId: user.id } });
    await prisma.eventType.deleteMany({
      where: { id: { in: [eventType?.id, seatedEventType?.id, secondEventType?.id].filter(Boolean) } },
    });
    await prisma.availability.deleteMany({ where: { scheduleId: schedule?.id } });
    if (schedule?.id) await prisma.schedule.delete({ where: { id: schedule.id } });
    if (user?.id) await prisma.user.delete({ where: { id: user.id } });
  });

  test("should block slot from being available when reserved by another user", async () => {
    vi.setSystemTime("2026-06-15T01:30:00Z");
    const yesterdayDateString = "2026-06-14";
    const plus2DateString = "2026-06-17";
    const plus5DateString = "2026-06-20";

    await prisma.selectedSlots.create({
      data: {
        eventTypeId: eventType.id,
        userId: user.id,
        slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
        slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
        uid: `other-user-uid-${timestamp}`,
        releaseAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const availableSlotsService = getAvailableSlotsService();
    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${yesterdayDateString}T18:30:00.000Z`,
        endTime: `${plus5DateString}T18:29:59.999Z`,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    expect(schedule).not.toHaveTimeSlots([`04:00:00.000Z`], {
      dateString: plus2DateString,
    });
  });

  test("should keep all slots available when slot is reserved by the same user", async () => {
    vi.setSystemTime("2026-06-15T01:30:00Z");
    const yesterdayDateString = "2026-06-14";
    const plus2DateString = "2026-06-17";
    const plus5DateString = "2026-06-20";

    const bookerClientUid = `same-user-uid-${timestamp}`;

    await prisma.selectedSlots.create({
      data: {
        eventTypeId: eventType.id,
        userId: user.id,
        slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
        slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
        uid: bookerClientUid,
        releaseAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const availableSlotsService = getAvailableSlotsService();
    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${yesterdayDateString}T18:30:00.000Z`,
        endTime: `${plus5DateString}T18:29:59.999Z`,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
      ctx: {
        req: {
          cookies: {
            uid: bookerClientUid,
          },
        } as IncomingMessage & { cookies: { uid: string } },
      },
    } satisfies GetScheduleOptions);

    expect(schedule).toHaveTimeSlots(
      [
        "04:00:00.000Z",
        "04:45:00.000Z",
        "05:30:00.000Z",
        "06:15:00.000Z",
        "07:00:00.000Z",
        "07:45:00.000Z",
        "08:30:00.000Z",
        "09:15:00.000Z",
        "10:00:00.000Z",
        "10:45:00.000Z",
        "11:30:00.000Z",
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  test("should make all slots available when reservation is expired", async () => {
    vi.setSystemTime("2026-06-15T01:30:00Z");
    const yesterdayDateString = "2026-06-14";
    const plus2DateString = "2026-06-17";
    const plus5DateString = "2026-06-20";

    await prisma.selectedSlots.create({
      data: {
        eventTypeId: eventType.id,
        userId: user.id,
        slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
        slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
        uid: `expired-slot-uid-${timestamp}`,
        releaseAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (expired)
      },
    });

    const availableSlotsService = getAvailableSlotsService();
    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${yesterdayDateString}T18:30:00.000Z`,
        endTime: `${plus5DateString}T18:29:59.999Z`,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    expect(schedule).toHaveTimeSlots(
      [
        "04:00:00.000Z",
        "04:45:00.000Z",
        "05:30:00.000Z",
        "06:15:00.000Z",
        "07:00:00.000Z",
        "07:45:00.000Z",
        "08:30:00.000Z",
        "09:15:00.000Z",
        "10:00:00.000Z",
        "10:45:00.000Z",
        "11:30:00.000Z",
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  test("should show correct attendee count as per reserved slots", async () => {
    vi.setSystemTime("2026-06-15T01:30:00Z");
    const yesterdayDateString = "2026-06-14";
    const plus2DateString = "2026-06-17";
    const plus5DateString = "2026-06-20";

    await prisma.selectedSlots.create({
      data: {
        eventTypeId: seatedEventType.id,
        userId: user.id,
        slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
        slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
        uid: `seat-uid-${timestamp}`,
        releaseAt: new Date(Date.now() + 1000 * 60 * 60),
        isSeat: true,
      },
    });

    const availableSlotsService = getAvailableSlotsService();
    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: seatedEventType.id,
        eventTypeSlug: "",
        startTime: `${yesterdayDateString}T18:30:00.000Z`,
        endTime: `${plus5DateString}T18:29:59.999Z`,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    const slot = schedule.slots[plus2DateString]?.find(
      (slot) => slot.time === `${plus2DateString}T04:00:00.000Z`
    );
    expect(slot).toBeDefined();
    expect(slot?.attendees).toBe(1);
  });

  test("should block slots even when reservation is for a different event type", async () => {
    vi.setSystemTime("2026-06-15T01:30:00Z");
    const yesterdayDateString = "2026-06-14";
    const plus2DateString = "2026-06-17";
    const plus5DateString = "2026-06-20";

    await prisma.selectedSlots.create({
      data: {
        eventTypeId: secondEventType.id,
        userId: user.id,
        slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
        slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
        uid: `diff-event-uid-${timestamp}`,
        releaseAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const availableSlotsService = getAvailableSlotsService();
    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${yesterdayDateString}T18:30:00.000Z`,
        endTime: `${plus5DateString}T18:29:59.999Z`,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    expect(schedule).toHaveTimeSlots(
      [
        // "04:00:00.000Z", — blocked by reservation on different event type
        "04:45:00.000Z",
        "05:30:00.000Z",
        "06:15:00.000Z",
        "07:00:00.000Z",
        "07:45:00.000Z",
        "08:30:00.000Z",
        "09:15:00.000Z",
        "10:00:00.000Z",
        "10:45:00.000Z",
        "11:30:00.000Z",
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  test("should clean up only expired slots", async () => {
    vi.setSystemTime("2026-06-15T01:30:00Z");
    const yesterdayDateString = "2026-06-14";
    const plus2DateString = "2026-06-17";
    const plus5DateString = "2026-06-20";

    const bookerClientUid = `cleanup-uid-${timestamp}`;
    const expiredTime = new Date(Date.now() - 1000 * 60 * 60);
    const notExpiredTime = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.selectedSlots.createMany({
      data: [
        // Will be deleted (expired)
        {
          eventTypeId: eventType.id,
          userId: user.id,
          slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
          slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
          uid: bookerClientUid,
          releaseAt: expiredTime,
        },
        // Will NOT be deleted (not expired)
        {
          eventTypeId: eventType.id,
          userId: user.id,
          slotUtcStartDate: new Date(`${plus2DateString}T05:00:00.000Z`),
          slotUtcEndDate: new Date(`${plus2DateString}T05:45:00.000Z`),
          uid: bookerClientUid,
          releaseAt: notExpiredTime,
        },
        // Will NOT be deleted (not expired, different user)
        {
          eventTypeId: eventType.id,
          userId: user.id,
          slotUtcStartDate: new Date(`${plus2DateString}T06:00:00.000Z`),
          slotUtcEndDate: new Date(`${plus2DateString}T06:45:00.000Z`),
          uid: `another-user-uid-${timestamp}`,
          releaseAt: notExpiredTime,
        },
        // Will be deleted (expired)
        {
          eventTypeId: eventType.id,
          userId: user.id,
          slotUtcStartDate: new Date(`${plus2DateString}T07:00:00.000Z`),
          slotUtcEndDate: new Date(`${plus2DateString}T07:45:00.000Z`),
          uid: `another-user-uid-${timestamp}`,
          releaseAt: expiredTime,
        },
      ],
    });

    const availableSlotsService = getAvailableSlotsService();
    await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${yesterdayDateString}T18:30:00.000Z`,
        endTime: `${plus5DateString}T18:29:59.999Z`,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
      ctx: {
        req: {
          cookies: {
            uid: bookerClientUid,
          },
        } as IncomingMessage & { cookies: { uid: string } },
      },
    } satisfies GetScheduleOptions);

    const remainingSlots = await prisma.selectedSlots.findMany({
      where: {
        userId: user.id,
        eventTypeId: eventType.id,
      },
    });

    expect(remainingSlots).toHaveLength(2);
  });
});
