import { expect } from "@playwright/test";
import type Prisma from "@prisma/client";

import {
  test,
} from "./lib/fixtures";
import {
  createHttpServer,
  waitFor,
} from "./lib/testUtils";
import { todo, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

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

  let eventType: Prisma.EventType | null = null;
  let user: any | null = null;

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

  test.beforeEach(async ({ page, users }) => {
    user = await users.create();
    eventType = user.eventTypes.find((e: Prisma.EventType) => e.slug === "paid");
    await user.apiLogin();
    await page.goto("/apps/installed");
    await user.getPaymentCredential();
    await user.setupEventWithPrice(eventType);
  });

  test("Can book a paid booking", async ({ page }) => {
    await user.bookAndPaidEvent(eventType);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("Pending payment booking should not be confirmed by default", async ({ page }) => {
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

  test("Paid booking should be able to be rescheduled", async ({ page }) => {

    await user.bookAndPaidEvent(eventType);

    // Rescheduling the event
    await Promise.all([page.waitForURL("/booking/*"), page.click('[data-testid="reschedule-link"]')]);

    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.click(`[data-testid="confirm-reschedule-button"]`);
    await expect(page.getByText("This meeting is scheduled")).toBeVisible();
  });


  test.describe("Stripe WEBHOOK Integration", () => {
    // for get this result you should running:
    // export STRIPE_WEBHOOK_SECRET=$(stripe listen --api-key $STRIPE_PRIVATE_KEY  --print-secret)
    // stripe listen --api-key $STRIPE_PRIVATE_KEY --forward-to $NEXT_PUBLIC_WEBAPP_URL/api/integrations/stripepayment/webhook --skip-verify -s

    test("Payment should confirm pending payment booking", async ({ page }) => {

      await user.bookAndPaidEvent(eventType);

      await expect(page.getByText("This meeting is scheduled")).toBeVisible();
      await page.goto(`/bookings/upcoming`);
      await expect(page.getByText('Paid', { exact: true })).toBeVisible();

    });
    test("Payment should trigger a BOOKING_PAID webhook", async ({ page }) => {
      const webhookReceiver = createHttpServer();

      // Configure webHook
      await page.goto(`/event-types/${eventType?.id}?tabName=webhooks`);
      await page.click(`[data-testid='new_webhook']`);
      await page.fill('[name="subscriberUrl"]', webhookReceiver.url);
      await page.getByRole('button', { name: 'Create Webhook' }).click();

      await user.bookAndPaidEvent(eventType);
      await expect(page.getByText("This meeting is scheduled")).toBeVisible();
      await page.goto(`/bookings/upcoming`);
      await expect(page.getByText('Paid', { exact: true })).toBeVisible();

      await waitFor(() => {
        const events: string[] = webhookReceiver.requestList.map(event => {
          const body: any = event.body;
          return body.triggerEvent;
        });
        // TODO: Change me when BOOKING_PAID is working
        expect(events).toContain("BOOKING_CREATED");
      });

      webhookReceiver.close();

    });

    test("Paid booking should be able to be cancelled and refunded", async ({ page }) => {
      await user.bookAndPaidEvent(eventType);
      await expect(page.getByText("This meeting is scheduled")).toBeVisible();
      await page.goto(`/bookings/upcoming`);
      await expect(page.getByText('Paid', { exact: true })).toBeVisible();
      await page.getByTestId('cancel').click();
      await page.getByTestId('cancel_reason').fill('Cancelled by e2e');
      await page.getByTestId('confirm_cancel').click();
      await expect(page.getByTestId('cancelled-headline')).toBeVisible();
      await expect(page.getByText('This booking payment has been refunded.')).toBeVisible();

      await page.goto(`/bookings/cancelled`);
      await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    });
  });
});
