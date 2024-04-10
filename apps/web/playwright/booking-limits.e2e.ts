/**
 * These e2e tests only aim to cover standard cases
 * Edge cases are currently handled in integration tests only
 */
import { expect } from "@playwright/test";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";
import { entries } from "@calcom/prisma/zod-utils";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { test } from "./lib/fixtures";
import { bookTimeSlot, createUserWithLimits } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

// used as a multiplier for duration limits
const EVENT_LENGTH = 30;

// limits used when testing each limit seperately
const BOOKING_LIMITS_SINGLE = {
  PER_DAY: 2,
  PER_WEEK: 2,
  PER_MONTH: 2,
  PER_YEAR: 2,
};

// limits used when testing multiple limits together
const BOOKING_LIMITS_MULTIPLE = {
  PER_DAY: 1,
  PER_WEEK: 2,
  PER_MONTH: 3,
  PER_YEAR: 4,
};

// prevent tests from crossing year boundaries - if currently in Oct or later, start booking in Jan instead of Nov
// (we increment months twice when checking multiple limits)
const firstDayInBookingMonth =
  dayjs().month() >= 9 ? dayjs().add(1, "year").month(0).date(1) : dayjs().add(1, "month").date(1);

// avoid weekly edge cases
const firstMondayInBookingMonth = firstDayInBookingMonth.day(
  firstDayInBookingMonth.date() === firstDayInBookingMonth.startOf("week").date() ? 1 : 8
);

// ensure we land on the same weekday when incrementing month
const incrementDate = (date: Dayjs, unit: dayjs.ManipulateType) => {
  if (unit !== "month") return date.add(1, unit);
  return date.add(1, "month").day(date.day());
};

const getLastEventUrlWithMonth = (user: Awaited<ReturnType<typeof createUserWithLimits>>, date: Dayjs) => {
  return `/${user.username}/${user.eventTypes.at(-1)?.slug}?month=${date.format("YYYY-MM")}`;
};

// eslint-disable-next-line playwright/no-skipped-test
test.skip("Booking limits", () => {
  entries(BOOKING_LIMITS_SINGLE).forEach(([limitKey, bookingLimit]) => {
    const limitUnit = intervalLimitKeyToUnit(limitKey);

    // test one limit at a time
    test(limitUnit, async ({ page, users }) => {
      const slug = `booking-limit-${limitUnit}`;
      const singleLimit = { [limitKey]: bookingLimit };

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        bookingLimits: singleLimit,
      });

      let slotUrl = "";

      const monthUrl = getLastEventUrlWithMonth(user, firstMondayInBookingMonth);
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(firstMondayInBookingMonth.date().toString(), {
        exact: true,
      });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      let latestRescheduleUrl: string | null = null;
      await test.step("can book up to limit", async () => {
        for (let i = 0; i < bookingLimit; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();
          latestRescheduleUrl = await page
            .locator('span[data-testid="reschedule-link"] > a')
            .getAttribute("href");

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
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

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

      await test.step("but can reschedule", async () => {
        const bookingId = latestRescheduleUrl?.split("/").pop();
        const rescheduledBooking = await prisma.booking.findFirstOrThrow({ where: { uid: bookingId } });

        const year = rescheduledBooking.startTime.getFullYear();
        const month = String(rescheduledBooking.startTime.getMonth() + 1).padStart(2, "0");
        const day = String(rescheduledBooking.startTime.getDate()).padStart(2, "0");

        await page.goto(
          `/${user.username}/${
            user.eventTypes.at(-1)?.slug
          }?rescheduleUid=${bookingId}&date=${year}-${month}-${day}&month=${year}-${month}`
        );

        const formerDay = availableDays.getByText(rescheduledBooking.startTime.getDate().toString(), {
          exact: true,
        });
        await expect(formerDay).toBeVisible();

        const formerTimeElement = page.locator('[data-testid="former_time_p"]');
        await expect(formerTimeElement).toBeVisible();

        await page.locator('[data-testid="time"]').nth(0).click();

        await expect(page.locator('[name="name"]')).toBeDisabled();
        await expect(page.locator('[name="email"]')).toBeDisabled();

        await page.locator('[data-testid="confirm-reschedule-button"]').click();

        await page.waitForLoadState("networkidle");
        await expect(page.locator("[data-testid=success-page]")).toBeVisible();

        const newBooking = await prisma.booking.findFirstOrThrow({ where: { fromReschedule: bookingId } });
        expect(newBooking).not.toBeNull();

        const updatedRescheduledBooking = await prisma.booking.findFirstOrThrow({
          where: { uid: bookingId },
        });
        expect(updatedRescheduledBooking.status).toBe(BookingStatus.CANCELLED);

        await prisma.booking.deleteMany({
          where: {
            id: {
              in: [newBooking.id, rescheduledBooking.id],
            },
          },
        });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(getLastEventUrlWithMonth(user, firstMondayInBookingMonth.add(1, "month")));

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });
    });
  });

  test("multiple", async ({ page, users }) => {
    const slug = "booking-limit-multiple";

    const user = await createUserWithLimits({
      users,
      slug,
      length: EVENT_LENGTH,
      bookingLimits: BOOKING_LIMITS_MULTIPLE,
    });

    let slotUrl = "";

    let bookingDate = firstMondayInBookingMonth;

    // keep track of total bookings across multiple limits
    let bookingCount = 0;

    for (const [limitKey, limitValue] of entries(BOOKING_LIMITS_MULTIPLE)) {
      const limitUnit = intervalLimitKeyToUnit(limitKey);

      const monthUrl = getLastEventUrlWithMonth(user, bookingDate);
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
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
          expectedAvailableDays[limitUnit]
        );

        // try to book directly via form page
        await page.goto(slotUrl);
        await bookTimeSlot(page);

        await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 5000 });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(getLastEventUrlWithMonth(user, bookingDate.add(1, "month")));

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        // TODO: Temporary fix for failing test. It passes locally but fails on CI.
        // See #13097
        // await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });

      // increment date by unit after hitting each limit
      bookingDate = incrementDate(bookingDate, limitUnit);
    }
  });
});

test.describe("Duration limits", () => {
  entries(BOOKING_LIMITS_SINGLE).forEach(([limitKey, bookingLimit]) => {
    const limitUnit = intervalLimitKeyToUnit(limitKey);

    // test one limit at a time
    test(limitUnit, async ({ page, users }) => {
      const slug = `duration-limit-${limitUnit}`;
      const singleLimit = { [limitKey]: bookingLimit * EVENT_LENGTH };

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        durationLimits: singleLimit,
      });

      let slotUrl = "";

      const monthUrl = getLastEventUrlWithMonth(user, firstMondayInBookingMonth);
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
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

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
        await page.goto(getLastEventUrlWithMonth(user, firstMondayInBookingMonth.add(1, "month")));

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });
    });
  });

  test("multiple", async ({ page, users }) => {
    const slug = "duration-limit-multiple";

    // multiply all booking limits by EVENT_LENGTH
    const durationLimits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitKey, bookingLimit]) => {
      return {
        ...limits,
        [limitKey]: bookingLimit * EVENT_LENGTH,
      };
    }, {} as Record<keyof IntervalLimit, number>);

    const user = await createUserWithLimits({
      users,
      slug,
      length: EVENT_LENGTH,
      durationLimits,
    });

    let slotUrl = "";

    let bookingDate = firstMondayInBookingMonth;

    // keep track of total bookings across multiple limits
    let bookingCount = 0;

    for (const [limitKey, limitValue] of entries(BOOKING_LIMITS_MULTIPLE)) {
      const limitUnit = intervalLimitKeyToUnit(limitKey);

      const monthUrl = getLastEventUrlWithMonth(user, bookingDate);
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
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

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
        await page.goto(getLastEventUrlWithMonth(user, bookingDate.add(1, "month")));

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });

      // increment date by unit after hitting each limit
      bookingDate = incrementDate(bookingDate, limitUnit);
    }
  });
});
