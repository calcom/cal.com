import {
  createDelegationCredential,
  createOrganization,
  mockCalendar,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { Schedule, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { expectNoAttemptToGetAvailability } from "@calcom/testing/lib/bookingScenario/expects";
import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";
import { expect, expectedSlotsForSchedule } from "./expects";

describe("getSchedule Delegation Credential (integration)", () => {
  const timestamp = Date.now();

  let user: User;
  let userSchedule: Schedule;
  const createdEventTypeIds: number[] = [];
  const createdTeamIds: number[] = [];

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    user = await prisma.user.create({
      data: {
        username: `deleg-cred-user-${timestamp}`,
        name: "Delegation Cred Test User",
        email: `deleg-cred-user-${timestamp}@example.com`,
        timeZone: "Asia/Kolkata",
      },
    });

    // IST Work Hours schedule (09:30-18:00 IST = 04:00-12:30 UTC, all days)
    userSchedule = await prisma.schedule.create({
      data: {
        name: `DelegCred Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "Asia/Kolkata",
      },
    });

    await prisma.availability.create({
      data: {
        scheduleId: userSchedule.id,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T09:30:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultScheduleId: userSchedule.id },
    });

    // Ensure google-calendar app exists
    await prisma.app.upsert({
      where: { slug: "google-calendar" },
      update: { enabled: true },
      create: {
        slug: "google-calendar",
        dirName: "googlecalendar",
        categories: ["calendar"],
        enabled: true,
      },
    });

    // Create a user-level selected calendar (for Google)
    await prisma.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: `deleg-cal-${timestamp}@example.com`,
      },
    });
  });

  afterEach(async () => {
    vi.useRealTimers();

    // Clean up per-test event types
    if (createdEventTypeIds.length > 0) {
      await prisma.eventType.deleteMany({ where: { id: { in: createdEventTypeIds } } });
      createdEventTypeIds.length = 0;
    }

    // Clean up per-test delegation credentials, memberships, and teams
    for (const teamId of createdTeamIds) {
      await prisma.delegationCredential.deleteMany({ where: { organizationId: teamId } });
    }
    await prisma.membership.deleteMany({ where: { userId: user?.id } });
    for (const teamId of createdTeamIds) {
      await prisma.team.deleteMany({ where: { id: teamId } });
    }
    createdTeamIds.length = 0;
  });

  afterAll(async () => {
    // Clean up user-level data created in beforeAll
    await prisma.selectedCalendar.deleteMany({ where: { userId: user?.id } });
    await prisma.credential.deleteMany({ where: { userId: user?.id } });
    await prisma.eventType.deleteMany({ where: { userId: user?.id } });
    await prisma.availability.deleteMany({ where: { scheduleId: userSchedule?.id } });
    if (userSchedule?.id) await prisma.schedule.delete({ where: { id: userSchedule.id } });
    if (user?.id) await prisma.user.delete({ where: { id: user.id } });
  });

  async function createTestEventType(
    overrides: { slotInterval?: number; length?: number } = {}
  ): Promise<{ id: number; slug: string }> {
    const slug = `deleg-evt-${timestamp}-${createdEventTypeIds.length}`;
    const et = await prisma.eventType.create({
      data: {
        title: `DelegEvent ${slug}`,
        slug,
        length: overrides.length ?? 45,
        slotInterval: overrides.slotInterval ?? 45,
        userId: user.id,
        users: { connect: [{ id: user.id }] },
      },
    });
    createdEventTypeIds.push(et.id);
    return et;
  }

  function getSlots(
    eventTypeId: number,
    startTime: string,
    endTime: string
  ): ReturnType<ReturnType<typeof getAvailableSlotsService>["getAvailableSlots"]> {
    const availableSlotsService = getAvailableSlotsService();
    return availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId,
        eventTypeSlug: "",
        startTime,
        endTime,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
    });
  }

  test("correctly identifies unavailable slots using DelegationCredential credentials", async () => {
    const plus1DateString = "2026-06-15";
    const plus2DateString = "2026-06-16";
    vi.setSystemTime(`${plus1DateString}T01:00:00Z`);

    const org = await createOrganization({
      name: "Test Org",
      slug: `testorg-deleg-${timestamp}`,
    });
    createdTeamIds.push(org.id);

    // Add user as admin of the organization
    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: org.id,
        accepted: true,
        role: MembershipRole.ADMIN,
      },
    });

    await createDelegationCredential(org.id);

    await mockCalendar("googlecalendar", {
      create: {
        uid: "MOCK_ID",
        iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
      },
      busySlots: [
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ],
    });

    const et = await createTestEventType();

    const schedule = await getSlots(
      et.id,
      `${plus1DateString}T18:30:00.000Z`,
      `${plus2DateString}T18:29:59.999Z`
    );

    // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
    expect(schedule).toHaveTimeSlots([`04:00:00.000Z`], {
      dateString: plus2DateString,
    });
  });

  test("fails to get schedule when user isn't part of the organization with Delegation credential", async () => {
    const plus1DateString = "2026-06-15";
    const plus2DateString = "2026-06-16";
    vi.setSystemTime(`${plus1DateString}T01:00:00Z`);

    const org = await createOrganization({
      name: "Test Org",
      slug: `testorg-deleg2-${timestamp}`,
    });
    createdTeamIds.push(org.id);

    const anotherOrg = await createOrganization({
      name: "Another Org",
      slug: `anotherorg-deleg-${timestamp}`,
    });
    createdTeamIds.push(anotherOrg.id);

    // User is part of a DIFFERENT org (not the one with the delegation credential)
    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: anotherOrg.id,
        accepted: true,
        role: MembershipRole.ADMIN,
      },
    });

    // Create delegation credential on the org user is NOT part of
    await createDelegationCredential(org.id);

    const googleCalendarMock = await mockCalendar("googlecalendar", {
      create: {
        uid: "MOCK_ID",
        iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
      },
      busySlots: [
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ],
    });

    const et = await createTestEventType({ slotInterval: 60, length: 60 });

    const schedule = await getSlots(
      et.id,
      `${plus1DateString}T18:30:00.000Z`,
      `${plus2DateString}T18:29:59.999Z`
    );

    expectNoAttemptToGetAvailability(googleCalendarMock);

    // All slots would be available as no DelegationCredential credentials are available
    expect(schedule).toHaveTimeSlots(
      expectedSlotsForSchedule.IstWorkHours.interval["1hr"].allPossibleSlotsStartingAt430,
      {
        dateString: plus2DateString,
      }
    );
  });
});
