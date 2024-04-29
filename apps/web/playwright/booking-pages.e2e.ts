import { expect } from "@playwright/test";
import { JSDOM } from "jsdom";

import { randomString } from "@calcom/lib/random";
import { SchedulingType } from "@calcom/prisma/client";
import type { Schedule, TimeRange } from "@calcom/types/schedule";

import { test } from "./lib/fixtures";
import { testBothFutureAndLegacyRoutes } from "./lib/future-legacy-routes";
import {
  bookFirstEvent,
  bookOptinEvent,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  testEmail,
  testName,
  todo,
} from "./lib/testUtils";

const freeUserObj = { name: `Free-user-${randomString(3)}` };
test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test("check SSR and OG - User Event Type", async ({ page, users }) => {
  const name = "Test User";
  const user = await users.create({
    name,
  });
  const [response] = await Promise.all([
    // This promise resolves to the main resource response
    page.waitForResponse(
      (response) => response.url().includes(`/${user.username}/30-min`) && response.status() === 200
    ),

    // Trigger the page navigation
    page.goto(`/${user.username}/30-min`),
  ]);
  const ssrResponse = await response.text();
  const document = new JSDOM(ssrResponse).window.document;

  const titleText = document.querySelector("title")?.textContent;
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
  expect(titleText).toContain(name);
  // Verify that there is correct URL that would generate the awesome OG image
  expect(ogImage).toContain(
    "/_next/image?w=1200&q=100&url=%2Fapi%2Fsocial%2Fog%2Fimage%3Ftype%3Dmeeting%26title%3D"
  );
  // Verify Organizer Name in the URL
  expect(ogImage).toContain("meetingProfileName%3DTest%2520User%26");
});

todo("check SSR and OG - Team Event Type");

testBothFutureAndLegacyRoutes.describe("free user", () => {
  test.beforeEach(async ({ page, users }) => {
    const free = await users.create(freeUserObj);
    await page.goto(`/${free.username}`);
  });

  test("cannot book same slot multiple times", async ({ page, users, emails }) => {
    const [user] = users.get();

    const bookerObj = {
      email: users.trackEmail({ username: "testEmail", domain: "example.com" }),
      name: "testBooker",
    };
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await selectFirstAvailableTimeSlotNextMonth(page);

    await bookTimeSlot(page, bookerObj);

    // save booking url
    const bookingUrl: string = page.url();

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    const { title: eventTitle } = await user.getFirstEventAsOwner();

    await page.goto(bookingUrl);

    // book same time spot again
    await bookTimeSlot(page);

    await page.locator("[data-testid=booking-fail]").waitFor({ state: "visible" });
  });
});

testBothFutureAndLegacyRoutes.describe("pro user", () => {
  test.beforeEach(async ({ page, users }) => {
    const pro = await users.create();
    await page.goto(`/${pro.username}`);
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    const $eventTypes = page.locator("[data-testid=event-types] > *");
    expect(await $eventTypes.count()).toBeGreaterThanOrEqual(2);
  });

  test("book an event first day in next month", async ({ page }) => {
    await bookFirstEvent(page);
  });

  test("can reschedule a booking", async ({ page, users, bookings }) => {
    const [pro] = users.get();
    const [eventType] = pro.eventTypes;
    await bookings.create(pro.id, pro.username, eventType.id);

    await pro.apiLogin();
    await page.goto("/bookings/upcoming");
    await page.waitForSelector('[data-testid="bookings"]');
    await page.locator('[data-testid="edit_booking"]').nth(0).click();
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForURL((url) => {
      const bookingId = url.searchParams.get("rescheduleUid");
      return !!bookingId;
    });
    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.locator('[data-testid="confirm-reschedule-button"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
  });

  test("Can cancel the recently created booking and rebook the same timeslot", async ({
    page,
    users,
  }, testInfo) => {
    // Because it tests the entire booking flow + the cancellation + rebooking
    test.setTimeout(testInfo.timeout * 3);
    await bookFirstEvent(page);
    await expect(page.locator(`[data-testid="attendee-email-${testEmail}"]`)).toHaveText(testEmail);
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    const [pro] = users.get();
    await pro.apiLogin();

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking/");
    });
    await page.locator('[data-testid="confirm_cancel"]').click();

    const cancelledHeadline = page.locator('[data-testid="cancelled-headline"]');
    await expect(cancelledHeadline).toBeVisible();

    await expect(page.locator(`[data-testid="attendee-email-${testEmail}"]`)).toHaveText(testEmail);
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    await page.goto(`/${pro.username}`);
    await bookFirstEvent(page);
  });

  test("Can cancel the recently created booking and shouldn't be allowed to reschedule it", async ({
    page,
    users,
  }, testInfo) => {
    // Because it tests the entire booking flow + the cancellation + rebooking
    test.setTimeout(testInfo.timeout * 3);
    await bookFirstEvent(page);
    await expect(page.locator(`[data-testid="attendee-email-${testEmail}"]`)).toHaveText(testEmail);
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    const [pro] = users.get();
    await pro.apiLogin();

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking/");
    });
    await page.locator('[data-testid="confirm_cancel"]').click();

    const cancelledHeadline = page.locator('[data-testid="cancelled-headline"]');
    await expect(cancelledHeadline).toBeVisible();
    const bookingCancelledId = new URL(page.url()).pathname.split("/booking/")[1];
    await page.goto(`/reschedule/${bookingCancelledId}`);
    // Should be redirected to the booking details page which shows the cancelled headline
    await expect(page.locator('[data-testid="cancelled-headline"]')).toBeVisible();
  });

  test("can book an event that requires confirmation and then that booking can be accepted by organizer", async ({
    page,
    users,
  }) => {
    await bookOptinEvent(page);
    const [pro] = users.get();
    await pro.apiLogin();

    await page.goto("/bookings/unconfirmed");
    await Promise.all([
      page.click('[data-testid="confirm"]'),
      page.waitForResponse((response) => response.url().includes("/api/trpc/bookings/confirm")),
    ]);
    // This is the only booking in there that needed confirmation and now it should be empty screen
    await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();
  });

  test("can book an unconfirmed event multiple times", async ({ page, users }) => {
    await page.locator('[data-testid="event-type-link"]:has-text("Opt in")').click();
    await selectFirstAvailableTimeSlotNextMonth(page);

    const pageUrl = page.url();

    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // go back to the booking page to re-book.
    await page.goto(pageUrl);
    await bookTimeSlot(page, { email: "test2@example.com" });
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("cannot book an unconfirmed event multiple times with the same email", async ({ page, users }) => {
    await page.locator('[data-testid="event-type-link"]:has-text("Opt in")').click();
    await selectFirstAvailableTimeSlotNextMonth(page);

    const pageUrl = page.url();

    await bookTimeSlot(page);
    // go back to the booking page to re-book.
    await page.goto(pageUrl);

    await bookTimeSlot(page);
    await expect(page.getByText("Could not book the meeting.")).toBeVisible();
  });

  test("can book with multiple guests", async ({ page, users }) => {
    const additionalGuests = ["test@gmail.com", "test2@gmail.com"];

    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.fill('[name="name"]', "test1234");
    await page.fill('[name="email"]', "test1234@example.com");
    await page.locator('[data-testid="add-guests"]').click();

    await page.locator('input[type="email"]').nth(1).fill(additionalGuests[0]);
    await page.locator('[data-testid="add-another-guest"]').click();
    await page.locator('input[type="email"]').nth(2).fill(additionalGuests[1]);

    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const promises = additionalGuests.map(async (email) => {
      await expect(page.locator(`[data-testid="attendee-email-${email}"]`)).toHaveText(email);
    });
    await Promise.all(promises);
  });

  test("Time slots should be reserved when selected", async ({ context, page }) => {
    await page.click('[data-testid="event-type-link"]');

    const initialUrl = page.url();
    await selectFirstAvailableTimeSlotNextMonth(page);
    const pageTwo = await context.newPage();
    await pageTwo.goto(initialUrl);
    await pageTwo.waitForURL(initialUrl);

    await pageTwo.waitForSelector('[data-testid="event-type-link"]');
    const eventTypeLink = pageTwo.locator('[data-testid="event-type-link"]').first();
    await eventTypeLink.click();

    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="incrementMonth"]').waitFor();
    await pageTwo.click('[data-testid="incrementMonth"]');
    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

    // 9:30 should be the first available time slot
    await pageTwo.locator('[data-testid="time"]').nth(0).waitFor();
    const firstSlotAvailable = pageTwo.locator('[data-testid="time"]').nth(0);
    // Find text inside the element
    const firstSlotAvailableText = await firstSlotAvailable.innerText();
    expect(firstSlotAvailableText).toContain("9:30");
  });

  test("Time slots are not reserved when going back via Cancel button on Event Form", async ({
    context,
    page,
  }) => {
    const initialUrl = page.url();
    await page.waitForSelector('[data-testid="event-type-link"]');
    const eventTypeLink = page.locator('[data-testid="event-type-link"]').first();
    await eventTypeLink.click();
    await selectFirstAvailableTimeSlotNextMonth(page);

    const pageTwo = await context.newPage();
    await pageTwo.goto(initialUrl);
    await pageTwo.waitForURL(initialUrl);

    await pageTwo.waitForSelector('[data-testid="event-type-link"]');
    const eventTypeLinkTwo = pageTwo.locator('[data-testid="event-type-link"]').first();
    await eventTypeLinkTwo.click();

    await page.locator('[data-testid="back"]').waitFor();
    await page.click('[data-testid="back"]');

    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="incrementMonth"]').waitFor();
    await pageTwo.click('[data-testid="incrementMonth"]');
    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

    await pageTwo.locator('[data-testid="time"]').nth(0).waitFor();
    const firstSlotAvailable = pageTwo.locator('[data-testid="time"]').nth(0);

    // Find text inside the element
    const firstSlotAvailableText = await firstSlotAvailable.innerText();
    expect(firstSlotAvailableText).toContain("9:00");
  });
});

testBothFutureAndLegacyRoutes.describe("prefill", () => {
  test("logged in", async ({ page, users }) => {
    const prefill = await users.create({ name: "Prefill User" });
    await prefill.apiLogin();
    await page.goto("/pro/30min");

    await test.step("from session", async () => {
      await selectFirstAvailableTimeSlotNextMonth(page);
      await expect(page.locator('[name="name"]')).toHaveValue(prefill.name || "");
      await expect(page.locator('[name="email"]')).toHaveValue(prefill.email);
    });

    await test.step("from query params", async () => {
      const url = new URL(page.url());
      url.searchParams.set("name", testName);
      url.searchParams.set("email", testEmail);
      await page.goto(url.toString());

      await expect(page.locator('[name="name"]')).toHaveValue(testName);
      await expect(page.locator('[name="email"]')).toHaveValue(testEmail);
    });
  });

  test("Persist the field values when going back and coming back to the booking form", async ({
    page,
    users,
  }) => {
    await page.goto("/pro/30min");
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.fill('[name="name"]', "John Doe");
    await page.fill('[name="email"]', "john@example.com");
    await page.fill('[name="notes"]', "Test notes");
    await page.click('[data-testid="back"]');

    await selectFirstAvailableTimeSlotNextMonth(page);
    await expect(page.locator('[name="name"]')).toHaveValue("John Doe");
    await expect(page.locator('[name="email"]')).toHaveValue("john@example.com");
    await expect(page.locator('[name="notes"]')).toHaveValue("Test notes");
  });

  test("logged out", async ({ page, users }) => {
    await page.goto("/pro/30min");

    await test.step("from query params", async () => {
      await selectFirstAvailableTimeSlotNextMonth(page);

      const url = new URL(page.url());
      url.searchParams.set("name", testName);
      url.searchParams.set("email", testEmail);
      await page.goto(url.toString());

      await expect(page.locator('[name="name"]')).toHaveValue(testName);
      await expect(page.locator('[name="email"]')).toHaveValue(testEmail);
    });
  });
});

testBothFutureAndLegacyRoutes.describe("Booking on different layouts", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await page.goto(`/${user.username}`);
  });

  test("Book on week layout", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await page.click('[data-testid="toggle-group-item-week_view"]');

    await page.click('[data-testid="incrementMonth"]');

    await page.locator('[data-testid="calendar-empty-cell"]').nth(0).click();

    // Fill what is this meeting about? name email and notes
    await page.locator('[name="name"]').fill("Test name");
    await page.locator('[name="email"]').fill(`${randomString(4)}@example.com`);
    await page.locator('[name="notes"]').fill("Test notes");

    await page.click('[data-testid="confirm-book-button"]');

    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });

    // expect page to be booking page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("Book on column layout", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await page.click('[data-testid="toggle-group-item-column_view"]');

    await page.click('[data-testid="incrementMonth"]');

    await page.locator('[data-testid="time"]').nth(0).click();

    // Fill what is this meeting about? name email and notes
    await page.locator('[name="name"]').fill("Test name");
    await page.locator('[name="email"]').fill(`${randomString(4)}@example.com`);
    await page.locator('[name="notes"]').fill("Test notes");

    await page.click('[data-testid="confirm-book-button"]');

    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });

    // expect page to be booking page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });
});

testBothFutureAndLegacyRoutes.describe("Booking round robin event", () => {
  test.beforeEach(async ({ page, users }) => {
    const teamMatesObj = [{ name: "teammate-1" }];

    const dateRanges: TimeRange = {
      start: new Date(new Date().setUTCHours(10, 0, 0, 0)), //one hour after default schedule (teammate-1's schedule)
      end: new Date(new Date().setUTCHours(17, 0, 0, 0)),
    };

    const schedule: Schedule = [[], [dateRanges], [dateRanges], [dateRanges], [dateRanges], [dateRanges], []];

    const testUser = await users.create(
      { schedule },
      {
        hasTeam: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
        teamEventLength: 120,
        teammates: teamMatesObj,
      }
    );
    const team = await testUser.getFirstTeamMembership();
    await page.goto(`/team/${team.team.slug}`);
  });

  test("Does not book round robin host outside availability with date override", async ({ page, users }) => {
    const [testUser] = users.get();
    await testUser.apiLogin();

    const team = await testUser.getFirstTeamMembership();

    // Click first event type (round robin)
    await page.click('[data-testid="event-type-link"]');

    await page.click('[data-testid="incrementMonth"]');

    // books 9AM slots for 120 minutes (test-user is not available at this time, availability starts at 10)
    await page.locator('[data-testid="time"]').nth(0).click();

    await page.waitForLoadState("networkidle");

    await page.locator('[name="name"]').fill("Test name");
    await page.locator('[name="email"]').fill(`${randomString(4)}@example.com`);

    await page.click('[data-testid="confirm-book-button"]');

    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const host = page.locator('[data-testid="booking-host-name"]');
    const hostName = await host.innerText();

    //expect teammate-1 to be booked, test-user is not available at this time
    expect(hostName).toBe("teammate-1");

    // make another booking to see if also for the second booking teammate-1 is booked
    await page.goto(`/team/${team.team.slug}`);

    await page.click('[data-testid="event-type-link"]');

    await page.click('[data-testid="incrementMonth"]');
    await page.click('[data-testid="incrementMonth"]');

    // Again book a 9AM slot for 120 minutes where test-user is not available
    await page.locator('[data-testid="time"]').nth(0).click();

    await page.waitForLoadState("networkidle");

    await page.locator('[name="name"]').fill("Test name");
    await page.locator('[name="email"]').fill(`${randomString(4)}@example.com`);

    await page.click('[data-testid="confirm-book-button"]');

    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const hostSecondBooking = page.locator('[data-testid="booking-host-name"]');
    const hostNameSecondBooking = await hostSecondBooking.innerText();
    expect(hostNameSecondBooking).toBe("teammate-1"); // teammate-1 should be booked again
  });
});
