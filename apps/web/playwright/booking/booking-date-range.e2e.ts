import dayjs from "@calcom/dayjs";
import { expect } from "@playwright/test";
import type { Fixtures } from "../lib/fixtures";
import { test } from "../lib/fixtures";

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

const createRangeLimitedEvent = async ({ users }: { users: Fixtures["users"] }) => {
  const startMonth = dayjs().add(2, "month").startOf("month");
  const endMonth = dayjs().add(4, "month").startOf("month");
  const nextMonth = startMonth.add(1, "month");
  const currentMonth = dayjs().startOf("month");

  const eventSlug = `booking-date-range-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const user = await users.create({
    eventTypes: [
      {
        title: "Booking Date Range",
        slug: eventSlug,
        length: 30,
        periodType: "RANGE",
        periodStartDate: startMonth.toDate(),
        periodEndDate: endMonth.toDate(),
      },
    ],
  });

  return {
    user,
    eventSlug,
    startMonth,
    endMonth,
    nextMonth,
    currentMonth,
    publicBookingUrl: `/${user.username}/${eventSlug}`,
  };
};

test.describe("booking-date-range", () => {
  test("opens on the start month when today is before the booking window", async ({ page, users }) => {
    const event = await createRangeLimitedEvent({ users });

    await page.goto(event.publicBookingUrl);

    const selectedMonthLabel = page.getByTestId("selected-month-label");

    await expect(selectedMonthLabel).toContainText(event.startMonth.format("MMMM"));
    await expect(selectedMonthLabel).toContainText(event.startMonth.format("YYYY"));
    await expect(selectedMonthLabel).not.toContainText(event.currentMonth.format("MMMM"));
    await expect(page.getByText(/Scheduling ended/i)).not.toBeVisible();
  });

  test("disables the previous month button when already on the start month", async ({ page, users }) => {
    const event = await createRangeLimitedEvent({ users });

    await page.goto(event.publicBookingUrl);

    await expect(page.getByTestId("decrementMonth")).toBeDisabled();
  });

  test("disables the next month button when navigated to the end month", async ({ page, users }) => {
    const event = await createRangeLimitedEvent({ users });

    await page.goto(event.publicBookingUrl);

    const incrementMonth = page.getByTestId("incrementMonth");
    await incrementMonth.click();
    await incrementMonth.click();

    await expect(page.getByTestId("selected-month-label")).toContainText(event.endMonth.format("MMMM"));
    await expect(page.getByTestId("selected-month-label")).toContainText(event.endMonth.format("YYYY"));
    await expect(incrementMonth).toBeDisabled();
  });

  test("allows navigation between months inside the window", async ({ page, users }) => {
    const event = await createRangeLimitedEvent({ users });

    await page.goto(event.publicBookingUrl);

    const incrementMonth = page.getByTestId("incrementMonth");
    const decrementMonth = page.getByTestId("decrementMonth");
    const selectedMonthLabel = page.getByTestId("selected-month-label");

    await expect(incrementMonth).toBeEnabled();
    await incrementMonth.click();

    await expect(selectedMonthLabel).toContainText(event.nextMonth.format("MMMM"));
    await expect(selectedMonthLabel).toContainText(event.nextMonth.format("YYYY"));
    await expect(decrementMonth).toBeEnabled();
  });
});