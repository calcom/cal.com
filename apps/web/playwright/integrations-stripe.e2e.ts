import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, todo } from "./lib/testUtils";

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
      await page.getByRole('list').getByRole('button').click();
      await expect(
        page.getByRole('button', { name: 'Remove App' })
      ).toBeVisible();
    });
  });

  test("Can book a paid booking", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid");
    await user.apiLogin();
    await page.goto("/apps/installed");
    await user.getPaymentCredential();

    await page.goto(`/event-types/${eventType?.id}?tabName=apps`);
    await page.locator('div > .ml-auto').first().click();
    await expect(
      page.getByPlaceholder('Price')
    ).toBeVisible();
    await page.getByPlaceholder('Price').fill("100");
    await page.getByTestId('update-eventtype').click();

    await page.goto(`${user.username}/${eventType?.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.fill('[name="name"]', "Stripe Stripeson");
    await page.fill('[name="email"]', "test@example.com");

    await Promise.all([page.waitForURL("/payment/*"), page.press('[name="email"]', "Enter")]);

    const stripeFrame = page
      .frameLocator('iframe').first();
    expect(stripeFrame).toBeTruthy();
    await expect(stripeFrame.getByText("Card number")).toBeVisible();
    await stripeFrame.locator('[placeholder="1234 1234 1234 1234"]').fill("4242 4242 4242 4242");
    await stripeFrame.locator('[placeholder="MM / YY"]').fill("12 / 24");
    await stripeFrame.locator('[placeholder="CVC"]').fill("111");
    await stripeFrame.locator('[name="postalCode"]').fill("111111");
    await page.click('button:has-text("Pay now")');

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  todo("Pending payment booking should not be confirmed by default");
  todo("Payment should confirm pending payment booking");
  todo("Payment should trigger a BOOKING_PAID webhook");
  todo("Paid booking should be able to be rescheduled");
  todo("Paid booking should be able to be cancelled");
  todo("Cancelled paid booking should be refunded");
});
