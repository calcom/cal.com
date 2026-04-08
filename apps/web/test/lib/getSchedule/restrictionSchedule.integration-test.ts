import { afterAll, beforeAll, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, User, Team } from "@calcom/prisma/client";

import { expect } from "./expects";

describe("getSchedule restrictionSchedule (integration)", () => {
  let user: User;
  let userSchedule: Schedule;
  let org: Team;
  let team: Team;
  let restrictionSchedule: Schedule;
  const timestamp = Date.now();

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    org = await prisma.team.create({
      data: {
        name: `Restriction Org ${timestamp}`,
        slug: `restriction-org-${timestamp}`,
        isOrganization: true,
        metadata: { isOrganization: true },
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Restriction Team ${timestamp}`,
        slug: `restriction-team-${timestamp}`,
        parentId: org.id,
      },
    });

    user = await prisma.user.create({
      data: {
        username: `restriction-user-${timestamp}`,
        name: "Restriction Test User",
        email: `restriction-user-${timestamp}@example.com`,
        timeZone: "Asia/Kolkata",
      },
    });

    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: "ADMIN",
        accepted: true,
      },
    });

    userSchedule = await prisma.schedule.create({
      data: {
        name: `London Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "Europe/London",
      },
    });

    await prisma.availability.create({
      data: {
        scheduleId: userSchedule.id,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T17:00:00.000Z"),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultScheduleId: userSchedule.id },
    });

    restrictionSchedule = await prisma.schedule.create({
      data: {
        name: `Restriction Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "Asia/Dubai",
      },
    });
  });

  afterAll(async () => {
    await prisma.host.deleteMany({ where: { userId: user?.id } });
    await prisma.eventType.deleteMany({ where: { teamId: team?.id } });
    await prisma.availability.deleteMany({
      where: { scheduleId: { in: [userSchedule?.id, restrictionSchedule?.id].filter(Boolean) } },
    });
    await prisma.schedule.deleteMany({
      where: { id: { in: [userSchedule?.id, restrictionSchedule?.id].filter(Boolean) } },
    });
    await prisma.membership.deleteMany({ where: { userId: user?.id } });
    if (user?.id) await prisma.user.delete({ where: { id: user.id } });
    if (team?.id) await prisma.team.delete({ where: { id: team.id } });
    if (org?.id) await prisma.team.delete({ where: { id: org.id } });
  });

  test("should respect date override rule in restrictionSchedule (Europe/London, useBookerTimezone=false)", async () => {
    vi.setSystemTime("2025-06-01T23:30:00Z");

    const plus2DateString = "2025-06-02";
    const plus5DateString = "2025-06-05";

    // Set up restriction schedule with date override
    await prisma.availability.deleteMany({ where: { scheduleId: restrictionSchedule.id } });
    await prisma.availability.create({
      data: {
        scheduleId: restrictionSchedule.id,
        days: [],
        date: new Date("2025-06-02T00:00:00.000Z"),
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: `Date Override Restriction ${timestamp}`,
        slug: `date-override-restriction-${timestamp}`,
        length: 60,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        restrictionScheduleId: restrictionSchedule.id,
        useBookerTimezone: false,
      },
    });

    await prisma.host.create({
      data: {
        userId: user.id,
        eventTypeId: eventType.id,
        isFixed: false,
      },
    });

    try {
      const availableSlotsService = getAvailableSlotsService();
      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: eventType.id,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus5DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      const expectedUtcSlots = [
        "2025-06-02T08:30:00.000Z",
        "2025-06-02T09:30:00.000Z",
        "2025-06-02T10:30:00.000Z",
        "2025-06-02T11:30:00.000Z",
        "2025-06-02T12:30:00.000Z",
      ];

      expect(result).toHaveTimeSlots(expectedUtcSlots, {
        dateString: plus2DateString,
        doExactMatch: false,
      });
      expect(result).toHaveDateDisabled({ dateString: "2025-06-03" });
    } finally {
      await prisma.host.deleteMany({ where: { eventTypeId: eventType.id } });
      await prisma.eventType.delete({ where: { id: eventType.id } });
      vi.useRealTimers();
    }
  });

  test("should respect recurring rule in restrictionSchedule (Europe/London, useBookerTimezone=false)", async () => {
    vi.setSystemTime("2025-06-01T23:30:00Z");

    const plus6DateString = "2025-06-06";

    await prisma.availability.deleteMany({ where: { scheduleId: restrictionSchedule.id } });
    await prisma.availability.create({
      data: {
        scheduleId: restrictionSchedule.id,
        days: [1, 2, 3, 4, 5],
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: `Recurring Restriction ${timestamp}`,
        slug: `recurring-restriction-${timestamp}`,
        length: 60,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        restrictionScheduleId: restrictionSchedule.id,
        useBookerTimezone: false,
      },
    });

    await prisma.host.create({
      data: {
        userId: user.id,
        eventTypeId: eventType.id,
        isFixed: false,
      },
    });

    try {
      const availableSlotsService = getAvailableSlotsService();
      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: eventType.id,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus6DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      const getExpectedSlotsForDate = (dateString: string) => [
        `${dateString}T08:30:00.000Z`,
        `${dateString}T09:30:00.000Z`,
        `${dateString}T10:30:00.000Z`,
        `${dateString}T11:30:00.000Z`,
        `${dateString}T12:30:00.000Z`,
      ];

      ["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"].forEach((dateString) => {
        expect(result).toHaveTimeSlots(getExpectedSlotsForDate(dateString), {
          dateString,
          doExactMatch: false,
        });
      });

      expect(result).toHaveDateDisabled({ dateString: "2025-06-07" });
      expect(result).toHaveDateDisabled({ dateString: "2025-06-08" });
    } finally {
      await prisma.host.deleteMany({ where: { eventTypeId: eventType.id } });
      await prisma.eventType.delete({ where: { id: eventType.id } });
      vi.useRealTimers();
    }
  });

  test("should respect recurring rule in restrictionSchedule (Europe/London, useBookerTimezone=true)", async () => {
    vi.setSystemTime("2025-06-01T23:30:00Z");

    const plus6DateString = "2025-06-06";

    await prisma.availability.deleteMany({ where: { scheduleId: restrictionSchedule.id } });
    await prisma.availability.create({
      data: {
        scheduleId: restrictionSchedule.id,
        days: [1, 2, 3, 4, 5],
        startTime: new Date("1970-01-01T10:00:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: `BookerTZ Restriction ${timestamp}`,
        slug: `bookertz-restriction-${timestamp}`,
        length: 60,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        restrictionScheduleId: restrictionSchedule.id,
        useBookerTimezone: true,
      },
    });

    await prisma.host.create({
      data: {
        userId: user.id,
        eventTypeId: eventType.id,
        isFixed: false,
      },
    });

    try {
      const availableSlotsService = getAvailableSlotsService();
      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: eventType.id,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus6DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      const getExpectedSlotsForDate = (dateString: string) => [
        `${dateString}T08:30:00.000Z`,
        `${dateString}T09:30:00.000Z`,
        `${dateString}T10:30:00.000Z`,
        `${dateString}T11:30:00.000Z`,
      ];

      ["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"].forEach((dateString) => {
        expect(result).toHaveTimeSlots(getExpectedSlotsForDate(dateString), {
          dateString,
          doExactMatch: false,
        });
      });

      expect(result).toHaveDateDisabled({ dateString: "2025-06-07" });
      expect(result).toHaveDateDisabled({ dateString: "2025-06-08" });
    } finally {
      await prisma.host.deleteMany({ where: { eventTypeId: eventType.id } });
      await prisma.eventType.delete({ where: { id: eventType.id } });
      vi.useRealTimers();
    }
  });

  test("should return all slots when no restriction schedule is applied", async () => {
    vi.setSystemTime("2025-06-01T23:30:00Z");

    const plus6DateString = "2025-06-06";

    const eventType = await prisma.eventType.create({
      data: {
        title: `No Restriction ${timestamp}`,
        slug: `no-restriction-${timestamp}`,
        length: 60,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        useBookerTimezone: false,
      },
    });

    await prisma.host.create({
      data: {
        userId: user.id,
        eventTypeId: eventType.id,
        isFixed: false,
      },
    });

    try {
      const availableSlotsService = getAvailableSlotsService();
      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: eventType.id,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus6DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      const getExpectedSlotsForDate = (dateString: string) => [
        `${dateString}T08:30:00.000Z`,
        `${dateString}T09:30:00.000Z`,
        `${dateString}T10:30:00.000Z`,
        `${dateString}T11:30:00.000Z`,
        `${dateString}T12:30:00.000Z`,
        `${dateString}T13:30:00.000Z`,
        `${dateString}T14:30:00.000Z`,
      ];

      ["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"].forEach((dateString) => {
        expect(result).toHaveTimeSlots(getExpectedSlotsForDate(dateString), {
          dateString,
          doExactMatch: false,
        });
      });

      const lateEveningSlot = `2025-06-02T14:30:00.000Z`;
      expect(result.slots["2025-06-02"].map((s) => s.time)).toContain(lateEveningSlot);
    } finally {
      await prisma.host.deleteMany({ where: { eventTypeId: eventType.id } });
      await prisma.eventType.delete({ where: { id: eventType.id } });
      vi.useRealTimers();
    }
  });
});
