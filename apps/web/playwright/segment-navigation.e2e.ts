import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  applySelectFilter,
  createFilterSegment,
  deleteSegment,
  expectSegmentCleared,
  expectSegmentSelected,
  selectSegment,
} from "./filter-helpers";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

/**
 * Navigate to bookings via full page load, waiting for the bookings API response.
 */
async function navigateToBookings(page: Page, status = "upcoming") {
  const bookingsGetResponse = page.waitForResponse((response) =>
    /\/api\/trpc\/bookings\/get.*/.test(response.url())
  );
  await page.goto(`/bookings/${status}`, { waitUntil: "domcontentloaded" });
  await bookingsGetResponse;
}

/**
 * Soft-navigate to a page by clicking a sidebar link, then wait for the
 * target URL to settle. This exercises the Next.js Router Cache path
 * (component reuse / soft navigation) rather than a full page reload.
 */
async function clickSidebarLink(page: Page, name: string) {
  await page.locator(`[data-test-id="${name}"]`).first().click();
}

/**
 * Soft-navigate away to /availability and back to /bookings via sidebar.
 * After returning, waits for the bookings table to be visible. We don't
 * wait for a network response because React Query may serve cached data
 * on soft navigation without making a new request.
 */
async function navigateAwayAndBack(page: Page) {
  await clickSidebarLink(page, "availability");
  await page.waitForURL("**/availability**");

  await clickSidebarLink(page, "bookings");
  await page.waitForURL("**/bookings/**");
}

test.describe("Segment soft-navigation persistence", () => {
  test("System segment persists after navigating away and back via sidebar", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    await navigateToBookings(page);
    await selectSegment(page, "My Bookings");
    await expectSegmentSelected(page, "My Bookings");

    await navigateAwayAndBack(page);
    await expectSegmentSelected(page, "My Bookings");
  });

  test("Custom segment persists after navigating away and back via sidebar", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    await navigateToBookings(page);

    await applySelectFilter(page, "eventTypeId", owner.eventTypes[0].title);
    const segmentName = "Nav Test Segment";
    await createFilterSegment(page, segmentName);
    await expectSegmentSelected(page, segmentName);

    await navigateAwayAndBack(page);
    await expectSegmentSelected(page, segmentName);

    await deleteSegment(page, segmentName);
  });

  test("Deselected segment stays cleared after navigating away and back", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    await navigateToBookings(page);
    await selectSegment(page, "My Bookings");
    await expectSegmentSelected(page, "My Bookings");

    // Deselect
    await selectSegment(page, "My Bookings");
    await expectSegmentCleared(page);

    await navigateAwayAndBack(page);
    await expectSegmentCleared(page);
  });

  test("Switching segments persists the latest selection after navigating away and back", async ({
    page,
    users,
  }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    await navigateToBookings(page);

    // Select system segment first
    await selectSegment(page, "My Bookings");
    await expectSegmentSelected(page, "My Bookings");

    // Create and switch to a custom segment
    await applySelectFilter(page, "eventTypeId", owner.eventTypes[0].title);
    const segmentName = "Switch Test Segment";
    await createFilterSegment(page, segmentName);
    await expectSegmentSelected(page, segmentName);

    await navigateAwayAndBack(page);
    // Should show the custom segment, not "My Bookings"
    await expectSegmentSelected(page, segmentName);

    await deleteSegment(page, segmentName);
  });

  test("Newly created segment persists after navigating away and back", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    await navigateToBookings(page);

    await applySelectFilter(page, "eventTypeId", owner.eventTypes[0].title);
    const segmentName = "New Segment Nav";
    await createFilterSegment(page, segmentName);
    await expectSegmentSelected(page, segmentName);

    await navigateAwayAndBack(page);
    await expectSegmentSelected(page, segmentName);

    await deleteSegment(page, segmentName);
  });
});

test.describe("Segment initialization performance", () => {
  test("At most one bookings.get call fires on full page load with a preferred segment", async ({
    page,
    users,
  }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    // Set up a preferred segment
    await navigateToBookings(page);
    await selectSegment(page, "My Bookings");
    await expectSegmentSelected(page, "My Bookings");

    // Track all bookings.get requests during a fresh page load
    const bookingsRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/trpc\/bookings\/get/.test(request.url())) {
        bookingsRequests.push(request.url());
      }
    });

    // Full page load (not soft nav) — this is where the double-fetch bug manifested
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded" });
    await expectSegmentSelected(page, "My Bookings");

    // Should be at most 1 (segment resolved before query fires), not 2
    expect(bookingsRequests.length).toBeLessThanOrEqual(1);
  });

  test("No setPreference call fires on full page load with an existing preferred segment", async ({
    page,
    users,
  }) => {
    const owner = await users.create(undefined, { hasTeam: true });
    await owner.apiLogin();

    // Set up a preferred segment
    await navigateToBookings(page);
    await selectSegment(page, "My Bookings");
    await expectSegmentSelected(page, "My Bookings");

    // Track setPreference requests during a fresh page load
    const setPreferenceRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/trpc\/filterSegments\/setPreference/.test(request.url())) {
        setPreferenceRequests.push(request.url());
      }
    });

    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded" });
    await expectSegmentSelected(page, "My Bookings");

    expect(setPreferenceRequests.length).toBe(0);
  });
});
