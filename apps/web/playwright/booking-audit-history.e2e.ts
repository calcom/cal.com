import { BookingStatus } from "@calcom/prisma/enums";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";
import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

async function enableFeatureFlag(
  prisma: Fixtures["prisma"],
  slug: string
): Promise<{ enabled: boolean } | null> {
  const existing = await prisma.feature.findUnique({ where: { slug } });
  await prisma.feature.upsert({
    where: { slug },
    update: { enabled: true },
    create: { slug, enabled: true, type: "OPERATIONAL" },
  });
  return existing;
}

async function restoreFeatureFlag(
  prisma: Fixtures["prisma"],
  slug: string,
  existing: { enabled: boolean } | null
): Promise<void> {
  if (existing) {
    await prisma.feature.update({
      where: { slug },
      data: { enabled: existing.enabled },
    });
  } else {
    await prisma.feature.deleteMany({ where: { slug } });
  }
}

async function createBooking({
  bookingsFixture,
  organizer,
  organizerEventType,
  attendees,
  relativeDate = 1,
  title,
}: {
  bookingsFixture: Fixtures["bookings"];
  organizer: { id: number; username: string | null };
  organizerEventType: { id: number };
  attendees: { name: string; email: string; timeZone: string }[];
  relativeDate?: number;
  title: string;
}): Promise<{ uid: string }> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startTime = new Date(Date.now() + relativeDate * DAY_MS);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  return await bookingsFixture.create(organizer.id, organizer.username, organizerEventType.id, {
    title,
    status: BookingStatus.ACCEPTED,
    startTime,
    endTime,
    attendees: {
      createMany: {
        data: [...attendees],
      },
    },
  });
}

async function seedAuditLogsForBooking({
  prisma,
  bookingUid,
  userUuid,
}: {
  prisma: Fixtures["prisma"];
  bookingUid: string;
  userUuid: string;
}): Promise<{ actor: { id: string }; logCount: number }> {
  const actor = await prisma.auditActor.upsert({
    where: { userUuid },
    create: { type: "USER", userUuid },
    update: {},
    select: { id: true },
  });

  const now = Date.now();

  const logs = [
    {
      bookingUid,
      actorId: actor.id,
      action: "CREATED" as const,
      type: "RECORD_CREATED" as const,
      timestamp: new Date(now - 3 * 60 * 1000),
      source: "WEBAPP" as const,
      operationId: uuidv4(),
      data: {
        version: 1,
        fields: {
          startTime: now + 24 * 60 * 60 * 1000,
          endTime: now + 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
          status: BookingStatus.PENDING,
          hostUserUuid: userUuid,
          seatReferenceUid: null,
        },
      },
    },
    {
      bookingUid,
      actorId: actor.id,
      action: "ACCEPTED" as const,
      type: "RECORD_UPDATED" as const,
      timestamp: new Date(now - 2 * 60 * 1000),
      source: "WEBAPP" as const,
      operationId: uuidv4(),
      data: {
        version: 1,
        fields: {
          status: { old: BookingStatus.PENDING, new: BookingStatus.ACCEPTED },
        },
      },
    },
    {
      bookingUid,
      actorId: actor.id,
      action: "LOCATION_CHANGED" as const,
      type: "RECORD_UPDATED" as const,
      timestamp: new Date(now - 1 * 60 * 1000),
      source: "WEBAPP" as const,
      operationId: uuidv4(),
      data: {
        version: 1,
        fields: {
          location: { old: "integrations:google:meet", new: "integrations:zoom" },
        },
      },
    },
  ];

  for (const log of logs) {
    await prisma.bookingAudit.create({
      data: {
        bookingUid: log.bookingUid,
        actorId: log.actorId,
        action: log.action,
        type: log.type,
        timestamp: log.timestamp,
        source: log.source,
        operationId: log.operationId,
        data: log.data as object,
      },
    });
  }

  return { actor, logCount: logs.length };
}

async function cleanupAuditData(
  prisma: Fixtures["prisma"],
  bookingUid: string,
  actorId: string
): Promise<void> {
  await prisma.bookingAudit.deleteMany({ where: { bookingUid } });
  // AuditActor is not deleted — AuditEvent FK (onDelete: Restrict) prevents it.
}

async function enableUserFeature(
  prisma: Fixtures["prisma"],
  userId: number,
  featureId: string
): Promise<void> {
  await prisma.userFeatures.upsert({
    where: { userId_featureId: { userId, featureId } },
    create: { userId, featureId, enabled: true, assignedBy: "e2e-test" },
    update: { enabled: true },
  });
}

async function setupOrgUserWithBookingAudit({
  users,
  bookings,
  prisma,
}: {
  users: Fixtures["users"];
  bookings: Fixtures["bookings"];
  prisma: Fixtures["prisma"];
}): Promise<{
  user: Awaited<ReturnType<Fixtures["users"]["create"]>>;
  booking: { uid: string };
  actor: { id: string };
  logCount: number;
  existingBookingsV3: { enabled: boolean } | null;
  existingBookingAudit: { enabled: boolean } | null;
}> {
  const existingBookingsV3 = await enableFeatureFlag(prisma, "bookings-v3");
  const existingBookingAudit = await enableFeatureFlag(prisma, "booking-audit");

  const user = await users.create(undefined, {
    hasTeam: true,
    isOrg: true,
    isOrgVerified: true,
    isDnsSetup: true,
    teamFeatureFlags: ["booking-audit"],
  });

  await enableUserFeature(prisma, user.id, "booking-audit");
  await enableUserFeature(prisma, user.id, "bookings-v3");

  const booking = await createBooking({
    title: "Audit Log Test Booking",
    bookingsFixture: bookings,
    relativeDate: 1,
    organizer: user,
    organizerEventType: user.eventTypes[0],
    attendees: [{ name: "Test Attendee", email: "audit-attendee@example.com", timeZone: "Europe/Berlin" }],
  });

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { uuid: true },
  });

  const { actor, logCount } = await seedAuditLogsForBooking({
    prisma,
    bookingUid: booking.uid,
    userUuid: dbUser.uuid,
  });

  return { user, booking, actor, logCount, existingBookingsV3, existingBookingAudit };
}

async function navigateToBookingSheet(page: Page, bookingUid: string): Promise<void> {
  const bookingsGetResponse = page.waitForResponse((response) =>
    /\/api\/trpc\/bookings\/get.*/.test(response.url())
  );
  await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded" });
  await bookingsGetResponse;

  const bookingItem = page.locator(`[data-booking-uid="${bookingUid}"]`);
  await expect(bookingItem).toBeVisible();
  await bookingItem.locator('[role="button"]').first().click();

  const sheet = page.locator('[role="dialog"]');
  await expect(sheet).toBeVisible();
}

async function openHistoryTab(page: Page): Promise<void> {
  const sheet = page.locator('[role="dialog"]');
  const historyLabel = sheet.locator('label:has-text("History")');
  await historyLabel.click();

  await page.waitForResponse((response) => /\/api\/trpc\/bookings\/getBookingHistory.*/.test(response.url()));
}

test.describe("Booking audit history tab", () => {
  test("shows audit logs in the history tab for an org user", async ({ page, users, bookings, prisma }) => {
    const { user, booking, actor, existingBookingsV3, existingBookingAudit } =
      await setupOrgUserWithBookingAudit({ users, bookings, prisma });

    try {
      await user.apiLogin();
      await navigateToBookingSheet(page, booking.uid);

      const sheet = page.locator('[role="dialog"]');
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Audit Log Test Booking");

      await openHistoryTab(page);

      const timeline = sheet.locator(".flex.flex-col.gap-0\\.5");
      await expect(timeline).toBeVisible();

      const logEntries = timeline.locator("> div");
      await expect(logEntries).toHaveCount(3);

      const showDetailsButtons = sheet.getByText("Show details");
      await expect(showDetailsButtons.first()).toBeVisible();

      await showDetailsButtons.first().click();

      await expect(sheet.getByText("Actor", { exact: true })).toBeVisible();
      await expect(sheet.getByText("Source", { exact: true })).toBeVisible();
      await expect(sheet.getByText("Timestamp", { exact: true })).toBeVisible();
    } finally {
      await cleanupAuditData(prisma, booking.uid, actor.id);
      await restoreFeatureFlag(prisma, "bookings-v3", existingBookingsV3);
      await restoreFeatureFlag(prisma, "booking-audit", existingBookingAudit);
    }
  });

  test("shows filters (search and actor) in the history tab", async ({ page, users, bookings, prisma }) => {
    const { user, booking, actor, existingBookingsV3, existingBookingAudit } =
      await setupOrgUserWithBookingAudit({ users, bookings, prisma });

    try {
      await user.apiLogin();
      await navigateToBookingSheet(page, booking.uid);

      await openHistoryTab(page);

      const sheet = page.locator('[role="dialog"]');
      const searchField = sheet.locator('input[type="text"]').first();
      await expect(searchField).toBeVisible();

      const actorFilterDropdown = sheet.getByText("Actor: All");
      await expect(actorFilterDropdown).toBeVisible();
    } finally {
      await cleanupAuditData(prisma, booking.uid, actor.id);
      await restoreFeatureFlag(prisma, "bookings-v3", existingBookingsV3);
      await restoreFeatureFlag(prisma, "booking-audit", existingBookingAudit);
    }
  });

  test("does not show history tab when booking-audit feature is disabled", async ({
    page,
    users,
    bookings,
    prisma,
  }) => {
    const existingBookingsV3 = await enableFeatureFlag(prisma, "bookings-v3");

    try {
      const user = await users.create(undefined, { hasTeam: true });
      await enableUserFeature(prisma, user.id, "bookings-v3");

      const booking = await createBooking({
        title: "No Audit Booking",
        bookingsFixture: bookings,
        relativeDate: 1,
        organizer: user,
        organizerEventType: user.eventTypes[0],
        attendees: [
          { name: "Test Attendee", email: "no-audit-attendee@example.com", timeZone: "Europe/Berlin" },
        ],
      });

      await user.apiLogin();
      await navigateToBookingSheet(page, booking.uid);

      const sheet = page.locator('[role="dialog"]');
      const historyLabel = sheet.locator('label:has-text("History")');
      await expect(historyLabel).toBeHidden();

      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("No Audit Booking");
    } finally {
      await restoreFeatureFlag(prisma, "bookings-v3", existingBookingsV3);
    }
  });
});
