import { expect } from "@playwright/test";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { entries } from "@calcom/prisma/zod-utils";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { test } from "./lib/fixtures";
import { bookTimeSlot, todo } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

const EVENT_LENGTH = 30;
const BOOKING_LIMITS_SINGLE = {
  day: 2,
  week: 2,
  month: 2,
  year: 2,
};
const BOOKING_LIMITS_MULTIPLE = {
  day: 1,
  week: 2,
  month: 3,
  year: 4,
};

// prevent tests from crossing year boundaries (if already in Nov, start booking in Jan instead of Dec)
const firstDayInBookingMonth =
  dayjs().month() === 10 ? dayjs().add(1, "year").month(0).date(1) : dayjs().add(1, "month").date(1);

// avoid weekly edge cases
const firstMondayInBookingMonth = firstDayInBookingMonth.day(
  firstDayInBookingMonth.date() === firstDayInBookingMonth.startOf("week").date() ? 1 : 8
);

// ensure we land on the same weekday when incrementing month
const incrementDate = (date: Dayjs, unit: dayjs.ManipulateType) => {
  if (unit !== "month") return date.add(1, unit);
  return date.add(1, "month").day(date.day());
};

test.describe("Booking limits", () => {
  entries(BOOKING_LIMITS_SINGLE).forEach(([limitUnit, bookingLimit]) => {
    const limitValue = bookingLimit;

    // test one limit at a time
    test(limitUnit, async ({ page, users }) => {
      const slug = `booking-limit-${limitUnit}`;
      const limit = { [`PER_${limitUnit.toUpperCase()}`]: limitValue };
      const user = await users.create({
        eventTypes: [{ title: slug, slug, length: EVENT_LENGTH, bookingLimits: limit }],
      });

      let slotUrl = "";

      const monthUrl = `/${user.username}/${slug}?month=${firstMondayInBookingMonth.format("YYYY-MM")}`;
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(firstMondayInBookingMonth.date().toString(), {
        exact: true,
      });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < bookingLimit; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      const expectedAvailableDays = {
        day: -1,
        week: -5,
        month: 0,
        year: 0,
      };

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden();

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
          expectedAvailableDays[limitUnit]
        );

        // try to book directly via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(
          `/${user.username}/${slug}?month=${firstMondayInBookingMonth.add(1, "month").format("YYYY-MM")}`
        );

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });
    });
  });

  test("multiple", async ({ page, users }) => {
    const slug = "booking-limit-multiple";
    const limits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitUnit, bookingLimit]) => {
      const limitValue = bookingLimit;
      return {
        ...limits,
        [`PER_${limitUnit.toUpperCase()}`]: limitValue,
      };
    }, {} as Record<keyof IntervalLimit, number>);

    const user = await users.create({
      eventTypes: [{ title: slug, slug, length: EVENT_LENGTH, bookingLimits: limits }],
    });

    let slotUrl = "";

    let bookingDate = firstMondayInBookingMonth;

    // keep track of total bookings across multiple limits
    let bookingCount = 0;

    for (const [limitUnit, limitValue] of entries(BOOKING_LIMITS_MULTIPLE)) {
      const monthUrl = `/${user.username}/${slug}?month=${bookingDate.format("YYYY-MM")}`;
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });

      const availableDaysBefore = await availableDays.count();

      await test.step(`can book up ${limitUnit} to limit`, async () => {
        for (let i = 0; i + bookingCount < limitValue; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);
          bookingCount++;

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      const expectedAvailableDays = {
        day: -1,
        week: -4, // one day will already be blocked by daily limit
        month: 0,
        year: 0,
      };

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden();

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
          expectedAvailableDays[limitUnit]
        );

        // try to book directly via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(`/${user.username}/${slug}?month=${bookingDate.add(1, "month").format("YYYY-MM")}`);

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });

      // increment date by unit after hitting each limit
      bookingDate = incrementDate(bookingDate, limitUnit);
    }
  });

  todo("Verify that past bookings count towards limits");

  todo("Consider edge cases e.g. partial weeks");
});

test.describe("Duration limits", () => {
  entries(BOOKING_LIMITS_SINGLE).forEach(([limitUnit, bookingLimit]) => {
    const limitValue = bookingLimit * EVENT_LENGTH;

    // test one limit at a time
    test(limitUnit, async ({ page, users }) => {
      const slug = `duration-limit-${limitUnit}`;
      const limit = { [`PER_${limitUnit.toUpperCase()}`]: limitValue };
      const user = await users.create({
        eventTypes: [{ title: slug, slug, length: EVENT_LENGTH, durationLimits: limit }],
      });

      let slotUrl = "";

      const monthUrl = `/${user.username}/${slug}?month=${firstMondayInBookingMonth.format("YYYY-MM")}`;
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(firstMondayInBookingMonth.date().toString(), {
        exact: true,
      });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < bookingLimit; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      const expectedAvailableDays = {
        day: -1,
        week: -5,
        month: 0,
        year: 0,
      };

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden();

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
          expectedAvailableDays[limitUnit]
        );

        // try to book directly via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(
          `/${user.username}/${slug}?month=${firstMondayInBookingMonth.add(1, "month").format("YYYY-MM")}`
        );

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });
    });
  });

  test("multiple", async ({ page, users }) => {
    const slug = "duration-limit-multiple";
    const limits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitUnit, bookingLimit]) => {
      const limitValue = bookingLimit * EVENT_LENGTH;
      return {
        ...limits,
        [`PER_${limitUnit.toUpperCase()}`]: limitValue,
      };
    }, {} as Record<keyof IntervalLimit, number>);

    const user = await users.create({
      eventTypes: [{ title: slug, slug, length: EVENT_LENGTH, durationLimits: limits }],
    });

    let slotUrl = "";

    let bookingDate = firstMondayInBookingMonth;

    // keep track of total bookings across multiple limits
    let bookingCount = 0;

    for (const [limitUnit, limitValue] of entries(BOOKING_LIMITS_MULTIPLE)) {
      const monthUrl = `/${user.username}/${slug}?month=${bookingDate.format("YYYY-MM")}`;
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });

      const availableDaysBefore = await availableDays.count();

      await test.step(`can book up ${limitUnit} to limit`, async () => {
        for (let i = 0; i + bookingCount < limitValue; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);
          bookingCount++;

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      const expectedAvailableDays = {
        day: -1,
        week: -4, // one day will already be blocked by daily limit
        month: 0,
        year: 0,
      };

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden();

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
          expectedAvailableDays[limitUnit]
        );

        // try to book directly via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(`/${user.username}/${slug}?month=${bookingDate.add(1, "month").format("YYYY-MM")}`);

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });

      // increment date by unit after hitting each limit
      bookingDate = incrementDate(bookingDate, limitUnit);
    }
  });

  todo("Verify that past bookings count towards limits");

  todo("Consider edge cases e.g. partial weeks");
});
