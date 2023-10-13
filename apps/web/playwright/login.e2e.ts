import { expect } from "@playwright/test";

import { login } from "./fixtures/users";
import { test } from "./lib/fixtures";
import { localize } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

// a test to logout requires both a succesfull login as logout, to prevent
// a doubling of tests failing on logout & logout, we can group them.
test.describe("user can login & logout succesfully", async () => {
  test.afterAll(async ({ users }) => {
    await users.deleteAll();
  });
  test("login flow user & logout using dashboard", async ({ page, users }) => {
    // log in trail user
    await test.step("Log in", async () => {
      const user = await users.create();
      await user.login();

      const shellLocator = page.locator(`[data-testid=dashboard-shell]`);

      // expects the home page for an authorized user
      await page.goto("/");
      await expect(shellLocator).toBeVisible();
    });

    //
    await test.step("Log out", async () => {
      const signOutLabel = (await localize("en"))("sign_out");
      const userDropdownDisclose = async () => page.locator("[data-testid=user-dropdown-trigger]").click();

      // disclose and click the sign out button from the user dropdown
      await userDropdownDisclose();
      const signOutBtn = await page.locator(`text=${signOutLabel}`);
      await signOutBtn.click();

      await page.locator("[data-testid=logout-btn]").click();

      // Reroute to the home page to check if the login form shows up
      await expect(page.locator(`[data-testid=login-form]`)).toBeVisible();
    });
  });
});

test.describe("Login and logout tests", () => {
  test.afterAll(async ({ users }) => {
    await users.deleteAll();
  });

  test.afterEach(async ({ users, page }) => {
    await users.logout();

    // check if we are at the login page
    await page.goto("/");
    await expect(page.locator(`[data-testid=login-form]`)).toBeVisible();
  });

  test.describe("Login flow validations", async () => {
    test("Should warn when user does not exist", async ({ page }) => {
      const alertMessage = (await localize("en"))("incorrect_email_password");

      // Login with a non-existent user
      const never = "never";
      await login({ username: never }, page);

      // assert for the visibility of the localized alert message
      await expect(page.locator(`text=${alertMessage}`)).toBeVisible();
    });

    test("Should warn when password is incorrect", async ({ page, users }) => {
      const alertMessage = (await localize("en"))("incorrect_email_password");
      // by default password===username with the users fixture
      const pro = await users.create({ username: "pro" });

      // login with a wrong password
      await login({ username: pro.username, password: "wrong" }, page);

      // assert for the visibility of the localized  alert message
      await expect(page.locator(`text=${alertMessage}`)).toBeVisible();
    });
  });
});
