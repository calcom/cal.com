import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";

import prisma from "@lib/prisma";

import { test } from "./lib/fixtures";
import { waitFor } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Change Passsword Test", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  // Using logged in state from globalSteup
  //   test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  //   test("User trial can change to normal username", async ({ page, users }) => {
  //     const user = await users.create({ plan: UserPlan.TRIAL });

  //     await user.login();
  //     // Try to go homepage
  //     await page.goto("/settings/profile");
  //     // Change username from normal to normal
  //     const usernameInput = page.locator("[data-testid=username-input]");
  //     const newUsername = `${user.username}x`;
  //     await usernameInput.fill(newUsername);

  //     // Click on save button
  //     const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

  //     await updateUsernameBtn.click();

  //     const goToBillingOrSaveBtn = page.locator("[data-testid=go-to-billing-or-save]");
  //     await goToBillingOrSaveBtn.click();
  //     // eslint-disable-next-line @typescript-eslint/no-empty-function
  //     await page.goto("/settings/profile");

  //     const newUpdatedUser = await prisma.user.findFirst({
  //       where: {
  //         id: user.id,
  //       },
  //     });
  //     expect(newUpdatedUser?.username).toBe(newUsername);
  //     await user.delete();
  //   });

  //   test("User pro can change to normal username", async ({ page, users }) => {
  //     const user = await users.create({ plan: UserPlan.PRO });

  //     await user.login();
  //     // Try to go homepage
  //     await page.goto("/settings/profile");
  //     // Change username from normal to normal
  //     const usernameInput = page.locator("[data-testid=username-input]");
  //     const newUsername = `${user.username}x`;
  //     await usernameInput.fill(newUsername);

  //     // Click on save button
  //     const updateUsernameBtn = page.locator("[data-testid=update-username-btn-desktop]");

  //     await updateUsernameBtn.click();

  //     const goToBillingOrSaveBtn = page.locator("[data-testid=go-to-billing-or-save]");
  //     await goToBillingOrSaveBtn.click();
  //     // eslint-disable-next-line @typescript-eslint/no-empty-function
  //     await page.goto("/settings/profile");

  //     const newUpdatedUser = await prisma.user.findFirst({
  //       where: {
  //         id: user.id,
  //       },
  //     });
  //     expect(newUpdatedUser?.username).toBe(newUsername);
  //     await user.delete();
  //   });

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
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await page.goto("/settings/profile");

    const newUsernameInput = await page.inputValue("[data-testid=username-input]");

    expect(newUsernameInput).toBe(newUsername);
  });
});
