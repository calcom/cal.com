import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Admin Users Management", () => {
  test("should add a new user successfully", async ({ page, users }) => {
    const adminUser = await users.create({
      role: "ADMIN",
    });

    await adminUser.apiLogin();

    await page.goto("/settings/admin/users/add");

    await page.waitForLoadState();

    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="username"]', "testuser");
    await page.fill('input[name="email"]', "testuser@example.com");
    await page.fill('input[name="bio"]', "Test user bio");

    await page.locator('[data-testid="timezone-select"] div').first().click();

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/trpc/users/add")
    );

    await page.click('button[type="submit"]');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    await page.waitForURL("/settings/admin/users");
  });

  test("should edit an existing user successfully", async ({ page, users }) => {
    const adminUser = await users.create({
      role: "ADMIN",
    });

    const userToEdit = await users.create({
      name: "Edit User",
      username: "edituser",
    });

    await adminUser.apiLogin();

    await page.goto(`/settings/admin/users/${userToEdit.id}/edit`);

    await page.waitForLoadState();

    await expect(page.locator('input[name="name"]')).toHaveValue("Edit User");

    await page.fill('input[name="name"]', "Updated User");

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/trpc/users/update")
    );

    await page.click('button[type="submit"]');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    await page.waitForURL("/settings/admin/users");
  });
});
