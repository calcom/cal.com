import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";
import dayjs from "dayjs";

import stripe from "@calcom/stripe/server";
import { getFreePlanPrice, getProPlanPrice } from "@calcom/stripe/utils";

import prisma from "@lib/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);

test.describe("Change username on settings", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("User trial can change to normal username", async ({ page, users }) => {
    const user = await users.create({ plan: UserPlan.TRIAL });

    await user.login();
    // Try to go homepage
    await page.goto("/settings/profile");
    // Change username from normal to normal
    const usernameInput = page.locator("[data-testid=username-input]");
    const newUsername = `${user.username}x`;
    await usernameInput.fill(newUsername);

    // Click on save button
    await page.click("[data-testid=update-username-btn-desktop]");

    await page.click("[data-testid=save-username]");
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(300);
    const newUpdatedUser = await prisma.user.findFirst({
      where: {
        id: user.id,
      },
    });
    expect(newUpdatedUser?.username).toBe(newUsername);
  });

  test("User pro can change to normal username", async ({ page, users }) => {
    const user = await users.create({ plan: UserPlan.PRO });

    await user.login();
    // Try to go homepage
    await page.goto("/settings/profile");
    // Change username from normal to normal
    const usernameInput = page.locator("[data-testid=username-input]");
    const newUsername = `${user.username}x`;
    await usernameInput.fill(newUsername);

    // Click on save button
    await page.click("[data-testid=update-username-btn-desktop]");

    await page.click("[data-testid=save-username]");

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(300);
    const newUpdatedUser = await prisma.user.findFirst({
      where: {
        id: user.id,
      },
    });
    expect(newUpdatedUser?.username).toBe(newUsername);
  });

  test("User Premium can change to premium username", async ({ page, users }) => {
    const user = await users.create({ plan: UserPlan.PRO });
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        username: "prox",
        metadata: {
          isPremiumUsername: true,
        },
      },
    });

    await user.login();
    // Try to go homepage
    await page.goto("/settings/profile");
    // Change username from normal to normal
    const usernameInput = page.locator("[data-testid=username-input]");
    const newUsername = `pre1`;
    await usernameInput.fill(newUsername);

    // Click on save button
    await page.click("[data-testid=update-username-btn-desktop]");

    await page.click("[data-testid=save-username]");

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(300);
    const newUpdatedUser = await prisma.user.findFirst({
      where: {
        id: user.id,
      },
    });
    expect(newUpdatedUser?.username).toBe(newUsername);
  });

  test("User trial can update to PREMIUM username", async ({ page, users }, testInfo) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");

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

    await usernameInput.fill(`xx${testInfo.workerIndex}`);

    // Click on save button
    await page.click("[data-testid=update-username-btn-desktop]");

    // Validate modal text fields
    const currentUsernameText = page.locator("[data-testid=current-username]").innerText();
    const newUsernameText = page.locator("[data-testid=new-username]").innerText();

    expect(currentUsernameText).not.toBe(newUsernameText);

    // Click on Go to billing
    await page.click("[data-testid=go-to-billing]", { timeout: 300 });

    await page.waitForLoadState();

    await expect(page).toHaveURL(/.*checkout.stripe.com/);
  });

  test("User PRO can update to PREMIUM username", async ({ page, users }, testInfo) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");

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

    await usernameInput.fill(`xx${testInfo.workerIndex}`);

    // Click on save button
    await page.click("[data-testid=update-username-btn-desktop]");

    // Validate modal text fields
    const currentUsernameText = page.locator("[data-testid=current-username]").innerText();
    const newUsernameText = page.locator("[data-testid=new-username]").innerText();

    expect(currentUsernameText).not.toBe(newUsernameText);

    // Click on Go to billing
    await page.click("[data-testid=go-to-billing]", { timeout: 300 });

    await page.waitForLoadState();

    await expect(page).toHaveURL(/.*billing.stripe.com/);
  });
});
