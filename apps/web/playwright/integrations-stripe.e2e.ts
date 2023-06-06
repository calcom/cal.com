import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, todo } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);

// TODO: No longer up to date, rewrite needed.

// eslint-disable-next-line playwright/no-skipped-test
test.skip();

test.describe("Stripe integration", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");

  test.describe("Stripe integration dashboard", () => {
    test("Can add Stripe integration", async ({ page, users }) => {
      const user = await users.create();
      await user.login();
      await page.goto("/apps/installed");

      await user.getPaymentCredential();

      /** If Stripe is added correctly we should see the "Disconnect" button */
      await expect(
        page.locator(`li:has-text("Stripe") >> [data-testid="stripe_payment-integration-disconnect-button"]`)
      ).toContainText("");
    });
  });

  test("Can book a paid booking", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid");
    await user.login();
    await page.goto("/apps/installed");
    await user.getPaymentCredential();

    await page.goto(`${user.username}/${eventType?.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.fill('[name="name"]', "Stripe Stripeson");
    await page.fill('[name="email"]', "test@example.com");

    await Promise.all([page.waitForURL("/payment/*"), page.press('[name="email"]', "Enter")]);

    const stripeFrame = page
      .frameLocator('iframe[src^="https://js.stripe.com/v3/elements-inner-card-"]')
      .first();

    // Fill [placeholder="Card number"]
    await stripeFrame.locator('[placeholder="Card number"]').fill("4242 4242 4242 4242");
    // Fill [placeholder="MM / YY"]
    await stripeFrame.locator('[placeholder="MM / YY"]').fill("12 / 24");
    // Fill [placeholder="CVC"]
    await stripeFrame.locator('[placeholder="CVC"]').fill("111");
    // Fill [placeholder="ZIP"]
    await stripeFrame.locator('[placeholder="ZIP"]').fill("11111");
    // Click button:has-text("Pay now")
    await page.click('button:has-text("Pay now")');

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  todo("Pending payment booking should not be confirmed by default");
  todo("Payment should confirm pending payment booking");
  todo("Payment should trigger a BOOKING_PAID webhook");
  todo("Paid booking should be able to be rescheduled");
  todo("Paid booking should be able to be cancelled");
  todo("Cancelled paid booking should be refunded");
});
