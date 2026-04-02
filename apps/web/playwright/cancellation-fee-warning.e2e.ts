import type { EventType } from "@calcom/prisma/client";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { IS_STRIPE_ENABLED, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Cancellation Fee Warning E2E", () => {
  test("Should display cancellation fee warning during booking submission", async ({ page, users }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.installStripePersonal({ skip: true });
    await user.setupEventWithPrice(eventType, "stripe");

    await page.goto(`/event-types/${eventType?.id}?tabName=advanced`);

    await page.locator('[data-testid="cancellation-fee-toggle"]').click();
    await page.locator('[data-testid="cancellation-fee-time-value"]').fill("2");
    await page.locator('[data-testid="cancellation-fee-time-unit"]').selectOption("hours");

    await page.getByTestId("update-eventtype").click();

    await page.goto(`${user.username}/${eventType?.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.fill('[name="name"]', "Test Booker");
    await page.fill('[name="email"]', "booker@example.com");

    await expect(page.getByText(/I acknowledge that if I cancel within 2 hours/)).toBeVisible();
  });

  test("Should display cancellation fee warning during cancellation", async ({ page, users }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.installStripePersonal({ skip: true });
    await user.setupEventWithPrice(eventType, "stripe");

    await page.goto(`/event-types/${eventType?.id}?tabName=advanced`);

    await page.locator('[data-testid="cancellation-fee-toggle"]').click();
    await page.locator('[data-testid="cancellation-fee-time-value"]').fill("24");
    await page.locator('[data-testid="cancellation-fee-time-unit"]').selectOption("hours");

    await page.getByTestId("update-eventtype").click();

    await user.bookAndPayEvent(eventType);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    await page.goto("/bookings/upcoming");
    await page.click('[data-testid="cancel"]');

    await expect(page.getByText(/Cancelling within 24 hours will result in a/)).toBeVisible();
  });

  test("Should not display cancellation fee warning when outside time threshold", async ({ page, users }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.installStripePersonal({ skip: true });
    await user.setupEventWithPrice(eventType, "stripe");

    await page.goto(`/event-types/${eventType?.id}?tabName=advanced`);

    await page.locator('[data-testid="cancellation-fee-toggle"]').click();
    await page.locator('[data-testid="cancellation-fee-time-value"]').fill("1");
    await page.locator('[data-testid="cancellation-fee-time-unit"]').selectOption("minutes");

    await page.getByTestId("update-eventtype").click();

    await page.goto(`${user.username}/${eventType?.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.fill('[name="name"]', "Test Booker");
    await page.fill('[name="email"]', "booker@example.com");

    await expect(page.getByText(/I acknowledge that if I cancel within/)).toBeHidden();
  });
});
