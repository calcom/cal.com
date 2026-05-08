import { expect } from "@playwright/test";
import { login } from "./fixtures/users";
import { test } from "./lib/fixtures";
import { localize } from "./lib/localize";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Change password", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test.describe("form submission", () => {
    test("succeeds and shows confirmation when given valid passwords", async ({ page, users }) => {
      const t = await localize("en");
      const successMsg = t("password_has_been_changed");

      const pro = await users.create();
      await pro.apiLogin();
      await page.goto("/settings/security/password");

      await page.getByRole("textbox", { name: "Old password" }).fill(String(pro.username));
      await page.getByRole("textbox", { name: "New password" }).fill(`${pro.username}Aa1111`);

      await submitAndWaitForResponse(page, "/api/trpc/auth/changePassword?batch=1", {
        action: () => page.getByRole("button", { name: "Update" }).click(),
      });

      // User gets visual confirmation of success
      await expect(page.getByTestId("toast-success")).toContainText(successMsg);

      // Form fields are reset after successful change
      await expect(page.getByRole("textbox", { name: "Old password" })).toHaveValue("");
      await expect(page.getByRole("textbox", { name: "New password" })).toHaveValue("");
    });

    test("fails when old password is incorrect", async ({ page, users, prisma }) => {
      const t = await localize("en");
      const incorrectPasswordMsg = t("incorrect_password");
      const errorUpdatingMsg = t("error_updating_password");

      const pro = await users.create();
      await pro.apiLogin();

      const passwordBefore = await prisma.userPassword.findUniqueOrThrow({
        where: { userId: pro.id },
        select: { hash: true },
      });

      await page.goto("/settings/security/password");

      // users fixture sets password === username, so any other valid string is wrong
      await page.getByRole("textbox", { name: "Old password" }).fill("WrongPassword1");
      await page.getByRole("textbox", { name: "New password" }).fill(`${pro.username}Aa1111`);

      await submitAndWaitForResponse(page, "/api/trpc/auth/changePassword?batch=1", {
        action: () => page.getByRole("button", { name: "Update" }).click(),
        expectedStatusCode: 400,
      });

      await expect(page.getByText(incorrectPasswordMsg, { exact: true })).toBeVisible();
      await expect(page.getByTestId("toast-error")).toContainText(errorUpdatingMsg);

      // Verify password hash in DB is unchanged — proves the failed attempt didn't mutate state
      const passwordAfter = await prisma.userPassword.findUniqueOrThrow({
        where: { userId: pro.id },
        select: { hash: true },
      });
      expect(passwordAfter.hash).toBe(passwordBefore.hash);
    });
  });

  test.describe("validation", () => {
    test("rejects new password shorter than 7 characters", async ({ page, users, prisma }) => {
      const t = await localize("en");
      const minLengthMsg = t("password_hint_min");

      const pro = await users.create();
      await pro.apiLogin();

      const passwordBefore = await prisma.userPassword.findUniqueOrThrow({
        where: { userId: pro.id },
        select: { hash: true },
      });

      await page.goto("/settings/security/password");

      await page.getByRole("textbox", { name: "Old password" }).fill(String(pro.username));
      await page.getByRole("textbox", { name: "New password" }).fill("abc");

      await page.getByRole("button", { name: "Update" }).click();

      // Client-side validation error appears inline (no API call made)
      await expect(page.getByText(minLengthMsg)).toBeVisible();

      const passwordAfter = await prisma.userPassword.findUniqueOrThrow({
        where: { userId: pro.id },
        select: { hash: true },
      });
      expect(passwordAfter.hash).toBe(passwordBefore.hash);
    });

    test("disables update button when form is empty", async ({ page, users }) => {
      const pro = await users.create();
      await pro.apiLogin();
      await page.goto("/settings/security/password");

      const updateButton = page.getByRole("button", { name: "Update" });
      await expect(updateButton).toBeDisabled();
    });
  });

  test.describe("credential rotation", () => {
    test("invalidates old password and accepts new one after change", async ({ page, users }) => {
      const t = await localize("en");
      const incorrectLoginMsg = t("incorrect_email_password");
      const successMsg = t("password_has_been_changed");

      const pro = await users.create();
      const oldPassword = String(pro.username);
      const newPassword = `${pro.username}Aa1111`;

      // 1. Log in and change the password
      await pro.apiLogin();
      await page.goto("/settings/security/password");

      await page.getByRole("textbox", { name: "Old password" }).fill(oldPassword);
      await page.getByRole("textbox", { name: "New password" }).fill(newPassword);

      await submitAndWaitForResponse(page, "/api/trpc/auth/changePassword?batch=1", {
        action: () => page.getByRole("button", { name: "Update" }).click(),
      });

      // Wait for success confirmation so the change is committed before we log out
      await expect(page.getByTestId("toast-success")).toContainText(successMsg);

      // 2. Log out
      await users.logout();

      // 3. Old password should now be rejected
      await login({ username: pro.username, password: oldPassword }, page);
      await expect(page.getByText(incorrectLoginMsg)).toBeVisible();

      // 4. New password should successfully authenticate
      await login({ username: pro.username, password: newPassword }, page);
      await page.waitForURL("/event-types");
    });
  });
});
