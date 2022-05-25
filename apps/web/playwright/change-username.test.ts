import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";

import prisma from "@lib/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Change Passsword Test", () => {
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
    const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

    await updateUsernameBtn.click();

    const goToBillingOrSaveBtn = page.locator("[data-testid=go-to-billing-or-save]");
    await goToBillingOrSaveBtn.click();
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);
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
    const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

    await updateUsernameBtn.click();

    const goToBillingOrSaveBtn = page.locator("[data-testid=go-to-billing-or-save]");
    await goToBillingOrSaveBtn.click();

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);
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
    const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

    await updateUsernameBtn.click();

    const goToBillingOrSaveBtn = page.locator("[data-testid=go-to-billing-or-save]");
    await goToBillingOrSaveBtn.click();

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);
    const newUpdatedUser = await prisma.user.findFirst({
      where: {
        id: user.id,
      },
    });
    expect(newUpdatedUser?.username).toBe(newUsername);
  });
});
