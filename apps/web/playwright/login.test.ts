import { expect } from "@playwright/test";
import { UserPlan } from "@prisma/client";

import { login } from "./fixtures/users";
import { test } from "./lib/fixtures";
import { localize } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Login and logout tests", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  // Test login with all plans
  const plans = [UserPlan.PRO, UserPlan.FREE, UserPlan.TRIAL];
  plans.forEach((plan) => {
    test(`Should login with a ${plan} account`, async ({ page, users }) => {
      // Create user and login
      const user = await users.create({ plan });
      await user.login();

      const shellLocator = page.locator(`[data-testid=dashboard-shell]`);

      // expects the home page for an authorized user
      await page.goto("/");
      await expect(shellLocator).toBeVisible();

      // Asserts to read the tested plan
      const planLocator = shellLocator.locator(`[data-testid=plan-${plan.toLowerCase()}]`);
      await expect(planLocator).toBeVisible();
      await expect(planLocator).toHaveText(`-${plan}`);

      // When TRIAL check if the TRIAL banner is visible
      if (plan === UserPlan.TRIAL) {
        await expect(page.locator(`[data-testid=trial-banner]`)).toBeVisible();
      }
    });
  });

  test("Should warn when user does not exist", async ({ page }) => {
    const alertMessage = (await localize("en"))("no_account_exists");

    // Login with a non-existent user
    const never = "never";
    await login({ username: never }, page);

    // assert for the visibility of the localized alert message
    await expect(page.locator(`text=${alertMessage}`)).toBeVisible();
  });

  test("Should warn when password is incorrect", async ({ page, users }) => {
    const alertMessage = (await localize("en"))("incorrect_password");
    // by default password===username with the users fixture
    const pro = await users.create({ username: "pro" });

    // login with a wrong password
    await login({ username: pro.username, password: "wrong" }, page);

    // assert for the visibility of the localized  alert message
    await expect(page.locator(`text=${alertMessage}`)).toBeVisible();
  });

  test("Should logout", async ({ page, users }) => {
    const signOutLabel = (await localize("en"))("sign_out");
    const userDropdownDisclose = async () => page.locator("[data-testid=user-dropdown-trigger]").click();

    // creates a user and login
    const pro = await users.create();
    await pro.login();

    // disclose and click the sign out button from the user dropdown
    await userDropdownDisclose();
    const signOutBtn = page.locator(`text=${signOutLabel}`);
    await signOutBtn.click();

    // 2s of delay to assure the session is cleared
    await page.waitForTimeout(2000);

    // Reroute to the home page to check if the login form shows up
    await page.goto("/");
    await expect(page.locator(`[data-testid=login-form]`)).toBeVisible();
  });

  test("Should logout using the logout route", async ({ page, users }) => {
    // creates a user and login
    const pro = await users.create();
    await pro.login();

    // users.logout() action uses the logout route "/auth/logout" to clear the session
    await users.logout();

    // check if we are at the login page
    await page.goto("/");
    await expect(page.locator(`[data-testid=login-form]`)).toBeVisible();
  });
});
