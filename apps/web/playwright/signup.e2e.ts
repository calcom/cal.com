import { expect } from "@playwright/test";

import { signup } from "./fixtures/users";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Signup", () => {
  test("Using existing email address and different username", async ({ page, users }) => {
    const signupLocator = page.locator("[data-testid=signup-form]");
    const alertLocator = signupLocator.locator("[data-testid=alert]");
    await signup({ username: "pro2", password: "Test1234", email: "pro@example.com" }, page);
    expect(await alertLocator.innerText()).toBe("Username or email is already taken");
  });
});
