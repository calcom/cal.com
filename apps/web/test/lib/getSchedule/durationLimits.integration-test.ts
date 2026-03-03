import { afterAll, beforeAll, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, Team, User } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { expect } from "./expects";

describe("getSchedule duration limits (integration)", () => {
  let user1: User;
  let user2: User;
  let team: Team;
  let schedule1: Schedule;
  let schedule2: Schedule;
  let eventType: EventType;
  const createdBookingIds: number[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    [user1, user2] = await Promise.all([
      prisma.user.create({
        data: {
          username: `dur-limit-user-1-${timestamp}`,
          name: "Duration Limit User 1",
          email: `dur-limit-user-1-${timestamp}@example.com`,
        },
      }),
      prisma.user.create({
        data: {
          username: `dur-limit-user-2-${timestamp}`,
          name: "Duration Limit User 2",
          email: `dur-limit-user-2-${timestamp}@example.com`,
        },
      }),
    ]);

    [schedule1, schedule2] = await Promise.all([
      prisma.schedule.create({
        data: {
          name: `Schedule 1 ${timestamp}`,
          userId: user1.id,
          timeZone: "UTC",
        },
      }),
      prisma.schedule.create({
        data: {
          name: `Schedule 2 ${timestamp}`,
          userId: user2.id,
          timeZone: "UTC",
        },
      }),
    ]);

    await prisma.availability.createMany({
      data: [
        {
          scheduleId: schedule1.id,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
        },
        {
          scheduleId: schedule2.id,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
        },
      ],
    });

    await Promise.all([
      prisma.user.update({
        where: { id: user1.id },
        data: { defaultScheduleId: schedule1.id },
      }),
      prisma.user.update({
        where: { id: user2.id },
        data: { defaultScheduleId: schedule2.id },
      }),
    ]);

    team = await prisma.team.create({
      data: {
        name: `Duration Limit Team ${timestamp}`,
        slug: `duration-limit-team-${timestamp}`,
      },
    });

    await prisma.membership.createMany({
      data: [
        {
          userId: user1.id,
          teamId: team.id,
          role: MembershipRole.ADMIN,
          accepted: true,
        },
        {
          userId: user2.id,
          teamId: team.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    eventType = await prisma.eventType.create({
      data: {
        title: "Duration Limit Event",
        slug: `duration-limit-event-${timestamp}`,
        length: 30,
        slotInterval: 30,
        teamId: team.id,
        userId: user1.id,
        schedulingType: SchedulingType.ROUND_ROBIN,
        durationLimits: { PER_YEAR: 480 },
        users: {
          connect: [{ id: user1.id }, { id: user2.id }],
        },
        hosts: {
          createMany: {
            data: [
              { userId: user1.id, isFixed: false },
              { userId: user2.id, isFixed: false },
            ],
          },
        },
      },
    });

    const [booking1, booking2] = await Promise.all([
      prisma.booking.create({
        data: {
          uid: `dur-limit-booking-1-${timestamp}`,
          title: "Duration Limit Booking 1",
          status: BookingStatus.ACCEPTED,
          userId: user1.id,
          eventTypeId: eventType.id,
          startTime: new Date("2026-01-10T00:00:00.000Z"),
          endTime: new Date("2026-01-10T06:40:00.000Z"), // 400 minutes
        },
      }),
      prisma.booking.create({
        data: {
          uid: `dur-limit-booking-2-${timestamp}`,
          title: "Duration Limit Booking 2",
          status: BookingStatus.ACCEPTED,
          userId: user2.id,
          eventTypeId: eventType.id,
          startTime: new Date("2026-01-11T00:00:00.000Z"),
          endTime: new Date("2026-01-11T06:40:00.000Z"), // 400 minutes
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
      where: { scheduleId: { in: [schedule1?.id, schedule2?.id].filter(Boolean) } },
    });
    await prisma.schedule.deleteMany({
      where: { id: { in: [schedule1?.id, schedule2?.id].filter(Boolean) } },
    });
    await prisma.membership.deleteMany({
      where: { teamId: team?.id },
    });
    if (team?.id) {
      await prisma.team.delete({
        where: { id: team.id },
      });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [user1?.id, user2?.id].filter(Boolean) } },
    });
  });

  test("yearly duration limit is enforced event-type-wide", async () => {
    vi.setSystemTime("2026-02-01T00:00:00Z");
    const dateString = "2026-02-10";

    const availableSlotsService = getAvailableSlotsService();
    const scheduleForEvent = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: eventType.id,
        eventTypeSlug: "",
        startTime: `${dateString}T00:00:00.000Z`,
        endTime: `${dateString}T23:59:59.999Z`,
        timeZone: "UTC",
        isTeamEvent: true,
        orgSlug: null,
      },
    });

    expect(scheduleForEvent).toHaveDateDisabled({ dateString });
  });
});
