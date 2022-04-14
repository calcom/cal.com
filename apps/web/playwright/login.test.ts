import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";

import { login } from "./fixtures/users";
import type { UserFixture } from "./fixtures/users";
import { test } from "./lib/fixtures";
import { localize } from "./lib/testUtils";

const TIMEOUT = 60000;

test.describe.parallel("Account tests", () => {
  // Test login with all plans
  test(`Should login with a PRO account`, async ({ page, users }) => {
    // Create user and login
    const pro = await users.create({ plan: UserPlan.PRO });
    await pro.login();
    await page.goto("/", { timeout: TIMEOUT });

    // expects the home page for an authorized user
    const shellLocator = await page.locator(`[data-testid=dashboard-shell]`);

    // Asserts to read the tested plan
    const planLocator = shellLocator.locator("[data-testid=plan-pro] >> text=PRO");
    await expect(planLocator).toBeVisible();
  });

  test(`Should login with a TRIAL account`, async ({ page, users }) => {
    // Create user and login
    const pro = await users.create({ plan: UserPlan.TRIAL });
    await pro.login();
    await page.goto("/", { timeout: TIMEOUT });

    // expects the home page for an authorized user
    const shellLocator = await page.locator(`[data-testid=dashboard-shell]`);

    // Asserts to read the tested plan
    const planLocator = shellLocator.locator("[data-testid=plan-trial] >> text=TRIAL");
    await expect(planLocator).toBeVisible();

    // check if the TRIAL banner is visible
    await expect(page.locator(`[data-testid=trial-banner]`)).toBeVisible();
  });

  test("Should warn when user does not exist", async ({ page, users }) => {
    const alertMessage = (await localize("en"))("no_account_exists");

    // Login with a non-existent user
    const never = "never";
    await login({ username: never }, page);
    // assert for the visibility of the localized alert message
    await expect(page.locator(`text=${alertMessage}`)).toBeVisible({ timeout: TIMEOUT });
  });

  test("Should warn when password is incorrect", async ({ page, users }) => {
    const alertMessage = (await localize("en"))("incorrect_password");
    // by default password===username with the users fixture
    const pro = await users.create({ username: "pro" });

    // login with a wrong password
    await login({ username: "pro", password: "wrong" }, page);

    // assert for the visibility of the localized  alert message
    await expect(page.locator(`text=${alertMessage}`)).toBeVisible({ timeout: TIMEOUT });
  });

  test("Should logout", async ({ page, users }) => {
    const signOutLabel = (await localize("en"))("sign_out");

    // creates a user and login
    const pro = await users.create();
    await pro.login();
    await page.goto("/", { timeout: TIMEOUT });
    // disclose and click the sign out button from the user dropdown
    await page.locator("[data-testid=user-dropdown-trigger]").click({ timeout: TIMEOUT });
    const signOutBtn = await page.locator(`text=${signOutLabel}`);
    await signOutBtn.click({ timeout: TIMEOUT });

    // for CI
    await page.waitForTimeout(2000);

    // Reroute to the home page to check if the login form shows up
    await page.goto("/", { timeout: TIMEOUT });

    await expect(page.locator(`[data-testid=login-form]`)).toBeVisible({ timeout: TIMEOUT });
  });

  test("Should logout using the logout route", async ({ page, users }) => {
    // creates a user and login
    const pro = await users.create();
    await pro.login();

    await page.goto("/", { timeout: TIMEOUT });
    // users.logout() action uses the logout route "/auth/logout" to clear the session
    await users.logout();

    // check if we are at the login page
    await page.goto("/", { timeout: TIMEOUT });
    await expect(page.locator(`[data-testid=login-form]`)).toBeVisible({ timeout: TIMEOUT });
  });
});
