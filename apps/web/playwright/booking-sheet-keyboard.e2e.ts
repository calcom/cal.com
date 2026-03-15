import { BookingStatus } from "@calcom/prisma/enums";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

async function enableBookingsV3(prisma: Fixtures["prisma"]) {
  const existing = await prisma.feature.findUnique({ where: { slug: "bookings-v3" } });
  await prisma.feature.upsert({
    where: { slug: "bookings-v3" },
    update: { enabled: true },
    create: { slug: "bookings-v3", enabled: true, type: "OPERATIONAL" },
  });
  return existing;
}

async function restoreBookingsV3(prisma: Fixtures["prisma"], existing: { enabled: boolean } | null) {
  if (existing) {
    await prisma.feature.update({
      where: { slug: "bookings-v3" },
      data: { enabled: existing.enabled },
    });
  } else {
    await prisma.feature.deleteMany({ where: { slug: "bookings-v3" } });
  }
}

async function createBooking({
  bookingsFixture,
  organizer,
  organizerEventType,
  attendees,
  relativeDate = 0,
  durationMins = 30,
  title,
}: {
  bookingsFixture: Fixtures["bookings"];
  organizer: { id: number; username: string | null };
  organizerEventType: { id: number };
  attendees: { name: string; email: string; timeZone: string }[];
  relativeDate?: number;
  durationMins?: number;
  title: string;
}) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const bookingDurationMs = durationMins * 60 * 1000;
  const startTime = new Date(Date.now() + relativeDate * DAY_MS);
  const endTime = new Date(Date.now() + relativeDate * DAY_MS + bookingDurationMs);
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

async function setupBookingsAndOpenSheet({
  page,
  users,
  bookings,
  prisma,
  bookingCount = 3,
}: {
  page: Page;
  users: Fixtures["users"];
  bookings: Fixtures["bookings"];
  prisma: Fixtures["prisma"];
  bookingCount?: number;
}) {
  const existingFlag = await enableBookingsV3(prisma);
  const user = await users.create();

  const fixtures = [];
  for (let i = 0; i < bookingCount; i++) {
    const fixture = await createBooking({
      title: `Booking ${i + 1}`,
      bookingsFixture: bookings,
      relativeDate: i + 1,
      organizer: user,
      organizerEventType: user.eventTypes[0],
      attendees: [{ name: `Attendee ${i + 1}`, email: `attendee${i + 1}@example.com`, timeZone: "Europe/Berlin" }],
    });
    fixtures.push(fixture);
  }

  await user.apiLogin();
  const bookingsGetResponse = page.waitForResponse((response) =>
    /\/api\/trpc\/bookings\/get.*/.test(response.url())
  );
  await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded" });
  await bookingsGetResponse;

  const firstBookingItem = page.locator(`[data-booking-uid="${fixtures[0].uid}"]`);
  await expect(firstBookingItem).toBeVisible();
  await firstBookingItem.locator('[role="button"]').first().click();

  const sheet = page.locator('[role="dialog"]');
  await expect(sheet).toBeVisible();

  return { user, fixtures, existingFlag, sheet };
}

test.describe("Booking sheet keyboard shortcuts", () => {
  test("ArrowDown navigates to the next booking", async ({ page, users, bookings, prisma }) => {
    const { fixtures, existingFlag, sheet } = await setupBookingsAndOpenSheet({
      page,
      users,
      bookings,
      prisma,
    });

    try {
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 1");

      await page.keyboard.press("ArrowDown");
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 2");
    } finally {
      await restoreBookingsV3(prisma, existingFlag);
    }
  });

  test("ArrowUp navigates to the previous booking", async ({ page, users, bookings, prisma }) => {
    const { fixtures, existingFlag, sheet } = await setupBookingsAndOpenSheet({
      page,
      users,
      bookings,
      prisma,
    });

    try {
      await page.keyboard.press("ArrowDown");
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 2");

      await page.keyboard.press("ArrowUp");
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 1");
    } finally {
      await restoreBookingsV3(prisma, existingFlag);
    }
  });

  test("ArrowDown at last booking does NOT open the actions dropdown", async ({
    page,
    users,
    bookings,
    prisma,
  }) => {
    const { fixtures, existingFlag, sheet } = await setupBookingsAndOpenSheet({
      page,
      users,
      bookings,
      prisma,
      bookingCount: 2,
    });

    try {
      await page.keyboard.press("ArrowDown");
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 2");

      await page.keyboard.press("ArrowDown");

      await page.waitForTimeout(500);
      const dropdownContent = page.locator('[data-radix-popper-content-wrapper]');
      await expect(dropdownContent).toBeHidden();

      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 2");
    } finally {
      await restoreBookingsV3(prisma, existingFlag);
    }
  });

  test("ArrowUp at first booking does NOT open the actions dropdown", async ({
    page,
    users,
    bookings,
    prisma,
  }) => {
    const { existingFlag, sheet } = await setupBookingsAndOpenSheet({
      page,
      users,
      bookings,
      prisma,
    });

    try {
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 1");

      await page.keyboard.press("ArrowUp");

      await page.waitForTimeout(500);
      const dropdownContent = page.locator('[data-radix-popper-content-wrapper]');
      await expect(dropdownContent).toBeHidden();

      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 1");
    } finally {
      await restoreBookingsV3(prisma, existingFlag);
    }
  });

  test("Escape closes the sheet", async ({ page, users, bookings, prisma }) => {
    const { existingFlag, sheet } = await setupBookingsAndOpenSheet({
      page,
      users,
      bookings,
      prisma,
    });

    try {
      await expect(sheet).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(sheet).toBeHidden();
    } finally {
      await restoreBookingsV3(prisma, existingFlag);
    }
  });

  test("Rapid arrow key presses navigate correctly without triggering dropdown", async ({
    page,
    users,
    bookings,
    prisma,
  }) => {
    const { fixtures, existingFlag, sheet } = await setupBookingsAndOpenSheet({
      page,
      users,
      bookings,
      prisma,
    });

    try {
      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 1");

      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");

      await expect(sheet.getByTestId("booking-sheet-title")).toHaveText("Booking 3");

      const dropdownContent = page.locator('[data-radix-popper-content-wrapper]');
      await expect(dropdownContent).toBeHidden();
    } finally {
      await restoreBookingsV3(prisma, existingFlag);
    }
  });
});
