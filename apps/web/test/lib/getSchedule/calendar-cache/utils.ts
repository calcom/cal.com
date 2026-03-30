import { vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { Credential, EventType, Schedule, Team, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

export const WEEKDAY_HOURLY_SLOTS = [
  "09:00:00.000Z",
  "10:00:00.000Z",
  "11:00:00.000Z",
  "12:00:00.000Z",
  "13:00:00.000Z",
  "14:00:00.000Z",
  "15:00:00.000Z",
  "16:00:00.000Z",
];

/**
 * All test dates are computed relative to the real current time so the test
 * never drifts beyond the 3-month cache horizon used by CalendarCacheWrapper.
 */
function nextMonday(from: Date, minDaysAhead: number): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

const realNow = new Date();
realNow.setUTCHours(0, 0, 0, 0);

// FAKED_NOW: 7 days ahead of real time (gives room for sync date math)
const fakedNowDate = new Date(realNow);
fakedNowDate.setUTCDate(fakedNowDate.getUTCDate() + 7);
export const FAKED_NOW = fakedNowDate.toISOString();

// Sync dates relative to FAKED_NOW
export const FRESH_SYNC_DATE = new Date(fakedNowDate.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before
export const STALE_SYNC_DATE = new Date(fakedNowDate.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days before (>7-day threshold)

export const CALENDAR_CACHE_FEATURE = "calendar-subscription-cache";
export const testDate = nextMonday(fakedNowDate, 14); // ~2 weeks after FAKED_NOW, well within 3-month horizon
export const farFutureDate = nextMonday(fakedNowDate, 100); // ~3.3 months after FAKED_NOW, beyond 3-month horizon

export type UserCalendarSetup = {
  user: User;
  schedule: Schedule;
  credential: Credential;
  selectedCalendarId: string;
};

export const createTestUser = async (suffix: string) =>
  prisma.user.create({
    data: {
      username: `cache-test-user-${suffix}`,
      name: `Cache Test User ${suffix}`,
      email: `cache-test-user-${suffix}@example.com`,
    },
  });

export const createScheduleWithAvailability = async (userId: number) => {
  const schedule = await prisma.schedule.create({
    data: { name: `Cache Test Schedule ${Date.now()}`, userId, timeZone: "UTC" },
  });
  await prisma.availability.create({
    data: {
      scheduleId: schedule.id,
      days: [1, 2, 3, 4, 5],
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T17:00:00.000Z"),
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { defaultScheduleId: schedule.id } });
  return schedule;
};

export const createGoogleCalendarApp = async () =>
  prisma.app.upsert({
    where: { slug: "google-calendar" },
    update: {},
    create: { slug: "google-calendar", dirName: "googlecalendar", categories: ["calendar"], enabled: true },
  });

export const createCredential = async (userId: number) =>
  prisma.credential.create({
    data: {
      type: "google_calendar",
      key: { access_token: "test", refresh_token: "test", token_type: "Bearer" },
      userId,
      appId: "google-calendar",
    },
  });

export const createSelectedCalendarWithSync = async (opts: {
  userId: number;
  credentialId: number;
  externalId: string;
}) =>
  prisma.selectedCalendar.create({
    data: {
      userId: opts.userId,
      integration: "google_calendar",
      externalId: opts.externalId,
      credentialId: opts.credentialId,
      syncToken: "test-sync-token",
      syncSubscribedAt: FRESH_SYNC_DATE,
      syncedAt: FRESH_SYNC_DATE,
    },
  });

export const enableFeatureForUser = async (userId: number) => {
  await prisma.feature.upsert({
    where: { slug: CALENDAR_CACHE_FEATURE },
    update: { enabled: true },
    create: {
      slug: CALENDAR_CACHE_FEATURE,
      enabled: true,
      type: "OPERATIONAL",
      description: "Calendar subscription cache for integration tests",
    },
  });
  await prisma.userFeatures.upsert({
    where: { userId_featureId: { userId, featureId: CALENDAR_CACHE_FEATURE } },
    update: { enabled: true },
    create: { userId, featureId: CALENDAR_CACHE_FEATURE, enabled: true, assignedBy: "integration-test" },
  });
};

export const createSoloEventType = async (userId: number) => {
  const ts = Date.now();
  return prisma.eventType.create({
    data: {
      title: `Cache Solo Event ${ts}`,
      slug: `cache-solo-event-${ts}`,
      length: 60,
      slotInterval: 60,
      userId,
      users: { connect: [{ id: userId }] },
    },
  });
};

export const seedCalendarCacheEvent = async (opts: {
  selectedCalendarId: string;
  externalId: string;
  start: Date;
  end: Date;
}) =>
  prisma.calendarCacheEvent.create({
    data: {
      selectedCalendarId: opts.selectedCalendarId,
      externalId: opts.externalId,
      externalEtag: `"etag-${opts.externalId}"`,
      start: opts.start,
      end: opts.end,
      status: "confirmed",
      summary: "Busy from cache",
    },
  });

export const createUserWithCalendarSetup = async (
  suffix: string,
  overrides?: { enableFeature?: boolean }
): Promise<UserCalendarSetup> => {
  const user = await createTestUser(suffix);
  const [schedule, credential] = await Promise.all([
    createScheduleWithAvailability(user.id),
    createCredential(user.id),
  ]);
  if (overrides?.enableFeature !== false) {
    await enableFeatureForUser(user.id);
  }
  const selectedCalendar = await createSelectedCalendarWithSync({
    userId: user.id,
    credentialId: credential.id,
    externalId: `cal-${suffix}@group.calendar.google.com`,
  });
  return { user, schedule, credential, selectedCalendarId: selectedCalendar.id };
};

export const buildCredentialForService = async (credentialId: number) => {
  const fullCredential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    include: { user: { select: { email: true } } },
  });
  return {
    ...fullCredential,
    appName: "google-calendar" as const,
    delegatedToId: null,
    delegatedTo: null,
    invalid: false,
  };
};

export const createTeamEventType = async (opts: { suffix: string; users: User[] }) => {
  const team = await prisma.team.create({
    data: { name: `Cache Team ${opts.suffix}`, slug: `cache-team-${opts.suffix}` },
  });
  await prisma.membership.createMany({
    data: opts.users.map((user, i) => ({
      userId: user.id,
      teamId: team.id,
      role: i === 0 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
      accepted: true,
    })),
  });
  const eventType = await prisma.eventType.create({
    data: {
      title: `Cache Team Event ${opts.suffix}`,
      slug: `cache-team-event-${opts.suffix}`,
      length: 60,
      slotInterval: 60,
      teamId: team.id,
      userId: opts.users[0].id,
      schedulingType: SchedulingType.ROUND_ROBIN,
      users: { connect: opts.users.map((u) => ({ id: u.id })) },
      hosts: { createMany: { data: opts.users.map((u) => ({ userId: u.id, isFixed: false })) } },
    },
  });
  return { team, eventType };
};

export const cleanupUserCalendarSetup = async (data: UserCalendarSetup) => {
  await prisma.calendarCacheEvent
    .deleteMany({ where: { selectedCalendarId: data.selectedCalendarId } })
    .catch(() => {});
  await Promise.all([
    prisma.selectedCalendar.deleteMany({ where: { id: data.selectedCalendarId } }).catch(() => {}),
    prisma.userFeatures
      .deleteMany({ where: { userId: data.user.id, featureId: CALENDAR_CACHE_FEATURE } })
      .catch(() => {}),
  ]);
  await Promise.all([
    prisma.credential.deleteMany({ where: { id: data.credential.id } }).catch(() => {}),
    prisma.availability.deleteMany({ where: { scheduleId: data.schedule.id } }).catch(() => {}),
  ]);
  await prisma.schedule.deleteMany({ where: { id: data.schedule.id } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: data.user.id } }).catch(() => {});
};

export const cleanupTeamEventType = async (opts: { eventTypeId: number; teamId: number }) => {
  await prisma.host.deleteMany({ where: { eventTypeId: opts.eventTypeId } }).catch(() => {});
  await prisma.eventType.deleteMany({ where: { id: opts.eventTypeId } }).catch(() => {});
  await prisma.membership.deleteMany({ where: { teamId: opts.teamId } }).catch(() => {});
  await prisma.team.delete({ where: { id: opts.teamId } }).catch(() => {});
};

export const getSlots = async (input: { eventTypeId: number; startTime: string; endTime: string }) => {
  const service = getAvailableSlotsService();
  return service.getAvailableSlots({
    input: {
      eventTypeId: input.eventTypeId,
      eventTypeSlug: "",
      startTime: input.startTime,
      endTime: input.endTime,
      timeZone: "UTC",
      isTeamEvent: false,
      orgSlug: null,
      _silentCalendarFailures: true,
    },
  });
};

export const getSlotsForDate = (eventTypeId: number, dateString: string = testDate) =>
  getSlots({
    eventTypeId,
    startTime: `${dateString}T00:00:00.000Z`,
    endTime: `${dateString}T23:59:59.999Z`,
  });

export const getTeamSlotsForDate = (eventTypeId: number, dateString: string = testDate) => {
  const service = getAvailableSlotsService();
  return service.getAvailableSlots({
    input: {
      eventTypeId,
      eventTypeSlug: "",
      startTime: `${dateString}T00:00:00.000Z`,
      endTime: `${dateString}T23:59:59.999Z`,
      timeZone: "UTC",
      isTeamEvent: true,
      orgSlug: null,
      _silentCalendarFailures: true,
    },
  });
};

export const getDynamicSlotsForDate = (usernameList: string[], dateString: string = testDate) => {
  const service = getAvailableSlotsService();
  return service.getAvailableSlots({
    input: {
      usernameList,
      eventTypeSlug: "dynamic",
      startTime: `${dateString}T00:00:00.000Z`,
      endTime: `${dateString}T23:59:59.999Z`,
      timeZone: "UTC",
      isTeamEvent: false,
      orgSlug: null,
      _silentCalendarFailures: true,
    },
  });
};

export const createSelectedCalendarWithoutSync = async (opts: {
  userId: number;
  credentialId: number;
  externalId: string;
}) =>
  prisma.selectedCalendar.create({
    data: {
      userId: opts.userId,
      integration: "google_calendar",
      externalId: opts.externalId,
      credentialId: opts.credentialId,
    },
  });

export { prisma, SchedulingType };
export type { Credential, EventType, Schedule, Team, User };
