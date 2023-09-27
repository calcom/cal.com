import { expect } from "@playwright/test";
import type Prisma from "@prisma/client";

import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { todo, selectFirstAvailableTimeSlotNextMonth, waitFor, createWebhookReceiver } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

const IS_STRIPE_ENABLED = !!(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_CLIENT_ID &&
  process.env.STRIPE_PRIVATE_KEY &&
  process.env.PAYMENT_FEE_FIXED &&
  process.env.PAYMENT_FEE_PERCENTAGE
);

test.describe("Stripe integration", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");

  test.describe("Stripe integration dashboard", () => {
    test("Can add Stripe integration", async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      await page.goto("/apps/installed");

      await user.getPaymentCredential();

      await expect(page.locator(`h3:has-text("Stripe")`)).toBeVisible();
      await page.getByRole("list").getByRole("button").click();
      await expect(page.getByRole("button", { name: "Remove App" })).toBeVisible();
    });
  });

  test("Can book a paid booking", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);
    // success
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("Pending payment booking should not be confirmed by default", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);

    // booking process without payment
    await page.goto(`${user.username}/${eventType?.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.fill('[name="name"]', "Stripe Stripeson");
    await page.fill('[name="email"]', "test@example.com");

    await Promise.all([page.waitForURL("/payment/*"), page.press('[name="email"]', "Enter")]);

    await page.goto(`/bookings/upcoming`);

    await expect(page.getByText("Unconfirmed")).toBeVisible();
    await expect(page.getByText("Pending payment").last()).toBeVisible();
  });

  test("Paid booking should be able to be rescheduled", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);

    // Rescheduling the event
    await Promise.all([page.waitForURL("/booking/*"), page.click('[data-testid="reschedule-link"]')]);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await Promise.all([
      page.waitForURL("/payment/*"),
      page.click('[data-testid="confirm-reschedule-button"]'),
    ]);

    await user.makePaymentUsingStripe();
  });

  test("Paid booking should be able to be cancelled", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
    await user.apiLogin();
    await page.goto("/apps/installed");

    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);

    await page.click('[data-testid="cancel"]');
    await page.click('[data-testid="confirm_cancel"]');

    await expect(await page.locator('[data-testid="cancelled-headline"]').first()).toBeVisible();
  });

  test("should not send a booking paid event when the payment is not confirmed by Stripe", async ({
    page,
    users,
  }) => {
    const user = await users.create({ name: "name" });
    const eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;

    await user.apiLogin();

    // installing Stripe
    await user.getPaymentCredential();

    const webhookReceiver = await createWebhookReceiver(page);

    await user.setupEventWithPrice(eventType);
    await user.bookAndPayEvent(eventType);

    await waitFor(() => {
      expect(webhookReceiver.requestList.length).toBe(2);
    }).catch((err) => {
      expect(err.message).toBe("waitFor timed out");
    });

    expect(webhookReceiver.requestList).toHaveLength(0);
  });

  test.describe("When event is paid and confirmed", () => {
    let user: Awaited<ReturnType<Fixtures["users"]["create"]>>;
    let eventType: Prisma.EventType;
    let webhookReceiver: Awaited<ReturnType<typeof createWebhookReceiver>>;

    test.beforeEach(async ({ page, users }) => {
      user = await users.create();
      eventType = user.eventTypes.find((e) => e.slug === "paid") as Prisma.EventType;
      await user.apiLogin();
      webhookReceiver = await createWebhookReceiver(page);
      await page.goto("/apps/installed");

      await user.getPaymentCredential();
      await user.setupEventWithPrice(eventType);
      await user.bookAndPayEvent(eventType);
      await user.confirmPendingPayment();
    });

    test("Cancelled paid booking should be refunded", async ({ page, users, request }) => {
      await page.click('[data-testid="cancel"]');
      await page.click('[data-testid="confirm_cancel"]');

      await expect(await page.locator('[data-testid="cancelled-headline"]').first()).toBeVisible();
      await expect(page.getByText("This booking payment has been refunded")).toBeVisible();
    });

    test("Payment should confirm pending payment booking", async ({ page, users }) => {
      await page.goto("/bookings/upcoming");

      const paidBadge = page.locator('[data-testid="paid_badge"]').first();

      await expect(paidBadge).toBeVisible();
      expect(await paidBadge.innerText()).toBe("Paid");
    });

    test("Payment should trigger a BOOKING_PAID webhook", async ({ page }) => {
      // --- check that webhook was called
      await waitFor(() => {
        expect(webhookReceiver.requestList.length).toBe(2);
      });

      const [, request] = webhookReceiver.requestList;

      expect(request.body).toMatchObject({
        triggerEvent: "BOOKING_PAID",
      });
    });

    todo("Paid and confirmed booking should be able to be rescheduled");
  });
});
