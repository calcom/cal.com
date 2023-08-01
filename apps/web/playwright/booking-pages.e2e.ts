import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";
import {
  bookFirstEvent,
  bookOptinEvent,
  bookTimeSlot,
  expectEmailsToHaveSubject,
  selectFirstAvailableTimeSlotNextMonth,
  testEmail,
  testName,
} from "./lib/testUtils";

const freeUserObj = { name: `Free-user-${randomString(3)}` };
test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("free user", () => {
  test.beforeEach(async ({ page, users }) => {
    const free = await users.create(freeUserObj);
    await page.goto(`/${free.username}`);
  });

  test("cannot book same slot multiple times", async ({ page, users, emails }) => {
    const [user] = users.get();
    const bookerObj = { email: `testEmail-${randomString(4)}@example.com`, name: "testBooker" };
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await selectFirstAvailableTimeSlotNextMonth(page);

    await bookTimeSlot(page, bookerObj);

    // save booking url
    const bookingUrl: string = page.url();

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    const { title: eventTitle } = await user.getFirstEventAsOwner();

    await expectEmailsToHaveSubject({
      emails,
      organizer: user,
      booker: bookerObj,
      eventTitle,
    });
    await page.goto(bookingUrl);

    // book same time spot again
    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=booking-fail]")).toBeVisible({ timeout: 1000 });
  });
});

test.describe("pro user", () => {
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

    additionalGuests.forEach(async (email) => {
      await expect(page.locator(`[data-testid="attendee-email-${email}"]`)).toHaveText(email);
    });
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

test.describe("prefill", () => {
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

const limitTests = [
  {
    type: "booking",
    divisor: 1,
    limits: {
      PER_DAY: 2,
      PER_WEEK: 2,
      PER_MONTH: 2,
      PER_YEAR: 2,
    },
  },
  {
    type: "duration",
    divisor: 30,
    limits: {
      PER_DAY: 30 * 2,
      PER_WEEK: 30 * 2,
      PER_MONTH: 30 * 2,
      PER_YEAR: 30 * 2,
    },
  },
];

// TODO: verify that past bookings count towards limits
// TODO: consider edge cases, e.g. partial weeks

limitTests.forEach((testParams) => {
  test.describe(`${testParams.type} limits`, () => {
    test("day", async ({ page, users }) => {
      const slug = "limit-day";
      const limit = { PER_DAY: testParams.limits.PER_DAY };
      const user = await users.create({
        eventTypes: [
          { title: `${testParams.type} limit`, slug, length: 30, [`${testParams.type}Limits`]: limit },
        ],
      });

      let dayUrl = "";
      let slotUrl = "";

      await page.goto(`/${user.username}/${slug}`);
      await page.getByTestId("incrementMonth").click();

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const firstAvailableDay = availableDays.nth(0);
      await expect(firstAvailableDay).toBeVisible();
      const availableDaysBefore = await availableDays.count();

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < Object.values(limit)[0] / testParams.divisor; i++) {
          await firstAvailableDay.click();

          dayUrl = page.url();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(`/${user.username}/${slug}`);
          await page.getByTestId("incrementMonth").click();
        }
      });

      await test.step("but not over", async () => {
        await page.goto(dayUrl);
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        await expect(page.getByTestId("time")).toBeHidden();

        expect(await availableDays.count()).toEqual(availableDaysBefore - 1);

        // try to book via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });
    });

    test("week", async ({ page, users }) => {
      const slug = "limit-week";
      const limit = { PER_WEEK: testParams.limits.PER_WEEK };
      const user = await users.create({
        eventTypes: [
          { title: `${testParams.type} limit`, slug, length: 30, [`${testParams.type}Limits`]: limit },
        ],
      });

      let dayUrl = "";
      let slotUrl = "";

      await page.goto(`/${user.username}/${slug}`);
      await page.getByTestId("incrementMonth").click();

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const firstAvailableDay = availableDays.nth(0);
      await expect(firstAvailableDay).toBeVisible();
      const availableDaysBefore = await availableDays.count();

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < Object.values(limit)[0] / testParams.divisor; i++) {
          // don't book possibly shorter first week (important for available days count later)
          await availableDays.nth(7).click();

          dayUrl = page.url();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(`/${user.username}/${slug}`);
          await page.getByTestId("incrementMonth").click();
        }
      });

      await test.step("but not over", async () => {
        await page.goto(dayUrl);
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        await expect(page.getByTestId("time")).toBeHidden();

        // the whole business week should now be blocked
        expect(await availableDays.count()).toEqual(availableDaysBefore - 5);

        // try to book via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });
    });

    test("month", async ({ page, users }) => {
      const slug = "limit-month";
      const limit = { PER_MONTH: testParams.limits.PER_MONTH };
      const user = await users.create({
        eventTypes: [
          { title: `${testParams.type} limit`, slug, length: 30, [`${testParams.type}Limits`]: limit },
        ],
      });

      let dayUrl = "";
      let slotUrl = "";

      await page.goto(`/${user.username}/${slug}`);
      await page.getByTestId("incrementMonth").click();

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const firstAvailableDay = availableDays.nth(0);
      await expect(firstAvailableDay).toBeVisible();

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < Object.values(limit)[0] / testParams.divisor; i++) {
          await firstAvailableDay.click();

          dayUrl = page.url();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(`/${user.username}/${slug}`);
          await page.getByTestId("incrementMonth").click();
        }
      });

      await test.step("but not over", async () => {
        await page.goto(dayUrl);
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        await expect(page.getByTestId("time")).toBeHidden();

        // the whole month should now be blocked
        expect(await availableDays.count()).toEqual(0);

        // try to book via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });
    });

    test("year", async ({ page, users }) => {
      const slug = "limit-year";
      const limit = { PER_YEAR: testParams.limits.PER_YEAR };
      const user = await users.create({
        eventTypes: [
          { title: `${testParams.type} limit`, slug, length: 30, [`${testParams.type}Limits`]: limit },
        ],
      });

      let dayUrl = "";
      let slotUrl = "";

      await page.goto(`/${user.username}/${slug}`);
      await page.getByTestId("incrementMonth").click();

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const firstAvailableDay = availableDays.nth(0);
      await expect(firstAvailableDay).toBeVisible();

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < Object.values(limit)[0] / testParams.divisor; i++) {
          await firstAvailableDay.click();

          dayUrl = page.url();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(`/${user.username}/${slug}`);
          await page.getByTestId("incrementMonth").click();
        }
      });

      await test.step("but not over", async () => {
        await page.goto(dayUrl);
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        await expect(page.getByTestId("time")).toBeHidden();

        // the whole year should now be blocked
        // FIXME: should check an additional month in the same year (but we may already be in December)
        expect(await availableDays.count()).toEqual(0);

        // try to book via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });
    });
  });
});
