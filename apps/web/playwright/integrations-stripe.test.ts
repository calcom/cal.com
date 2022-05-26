import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";
import dayjs from "dayjs";

import stripe from "@calcom/stripe/server";
import { getFreePlanPrice, getProPlanPrice } from "@calcom/stripe/utils";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);

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
        page.locator(`li:has-text("Stripe") >> [data-testid="integration-connection-button"]`)
      ).toContainText("Disconnect");

      // Cleanup
      await user.delete();
    });
  });

  test("Can book a paid booking", async ({ page, users }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "paid")!;
    await user.login();
    await page.goto("/apps/installed");
    await user.getPaymentCredential();

    await page.goto(`${user.username}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.fill('[name="name"]', "Stripe Stripeson");
    await page.fill('[name="email"]', "test@example.com");

    await Promise.all([page.waitForNavigation({ url: "/payment/*" }), page.press('[name="email"]', "Enter")]);

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

    // Cleanup
    await user.delete();
  });

  test("User trial can update to PREMIUM username", async ({ page, users }) => {
    const user = await users.create({ plan: UserPlan.TRIAL });
    const customer = await stripe.customers.create({ email: `${user?.username}@example.com` });
    await stripe.subscriptionSchedules.create({
      customer: customer.id,
      start_date: "now",
      end_behavior: "release",
      phases: [
        {
          items: [{ price: getProPlanPrice() }],
          trial_end: dayjs().add(14, "day").unix(),
          end_date: dayjs().add(14, "day").unix(),
        },
        {
          items: [{ price: getFreePlanPrice() }],
        },
      ],
    });

    await user.login();
    await page.goto("/settings/profile");

    // Change username from normal to premium
    const usernameInput = page.locator("[data-testid=username-input]");

    await usernameInput.fill("xxx1");

    // Click on save button
    const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

    await updateUsernameBtn.click();

    // Validate modal text fields
    const currentUsernameText = page.locator("[data-testid=current-username]").innerText();
    const newUsernameText = page.locator("[data-testid=new-username]").innerText();

    expect(currentUsernameText).not.toBe(newUsernameText);

    // Click on Go to billing
    const goToBillingBtn = page.locator("[data-testid=go-to-billing]");
    await goToBillingBtn.click();

    await page.waitForLoadState();

    await expect(page).toHaveURL(/.*checkout.stripe.com/);

    await user.delete();
  });

  test("User PRO can update to PREMIUM username", async ({ page, users }) => {
    const user = await users.create({ plan: UserPlan.PRO });
    const customer = await stripe.customers.create({ email: `${user?.username}@example.com` });
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: "4242424242424242",
        cvc: "123",
        exp_month: 12,
        exp_year: 2040,
      },
    });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
    await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: getProPlanPrice() }],
    });

    await user.login();
    await page.goto("/settings/profile");

    // Change username from normal to premium
    const usernameInput = page.locator("[data-testid=username-input]");

    await usernameInput.fill("xxx1");

    // Click on save button
    const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

    await updateUsernameBtn.click();

    // Validate modal text fields
    const currentUsernameText = page.locator("[data-testid=current-username]").innerText();
    const newUsernameText = page.locator("[data-testid=new-username]").innerText();

    expect(currentUsernameText).not.toBe(newUsernameText);

    // Click on Go to billing
    const goToBillingBtn = page.locator("[data-testid=go-to-billing]");
    await goToBillingBtn.click();

    await page.waitForLoadState();

    await expect(page).toHaveURL(/.*billing.stripe.com/);

    await user.delete();
  });

  // todo("Pending payment booking should not be confirmed by default");
  // todo("Payment should confirm pending payment booking");
  // todo("Payment should trigger a BOOKING_PAID webhook");
  // todo("Paid booking should be able to be rescheduled");
  // todo("Paid booking should be able to be cancelled");
  // todo("Cancelled paid booking should be refunded");
});
