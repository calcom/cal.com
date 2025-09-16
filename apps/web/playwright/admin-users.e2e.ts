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

    await page.waitForLoadState("networkidle");

    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="username"]', "testuser");
    await page.fill('input[name="email"]', "testuser@example.com");
    await page.fill('textarea[name="bio"]', "Test user bio");

    await page.click('[data-testid="select-role"]');
    await page.click('[data-testid="select-option-USER"]');

    await page.click('[data-testid="select-identity-provider"]');
    await page.click('[data-testid="select-option-CAL"]');

    await page.click('[data-testid="select-locale"]');
    await page.click('[data-testid="select-option-en"]');

    await page.click('[data-testid="select-time-format"]');
    await page.click('[data-testid="select-option-12"]');

    await page.click('[data-testid="select-week-start"]');
    await page.click('[data-testid="select-option-Sunday"]');

    await page.click('[data-testid="select-timezone"]');
    await page.click('[data-testid="select-option-UTC"]');

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/trpc/viewer.users.add")
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

    const userToEdit = await users.create();

    await adminUser.apiLogin();

    await page.goto(`/settings/admin/users/${userToEdit.id}`);

    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[name="name"]')).toHaveValue("Edit User");
    await expect(page.locator('input[name="username"]')).toHaveValue("edituser");
    await expect(page.locator('input[name="email"]')).toHaveValue("edituser@example.com");
    await expect(page.locator('textarea[name="bio"]')).toHaveValue("Original bio");

    await page.fill('input[name="name"]', "Updated User");
    await page.fill('textarea[name="bio"]', "Updated bio");

    await page.click('[data-testid="select-role"]');
    await page.click('[data-testid="select-option-ADMIN"]');

    await page.click('[data-testid="select-identity-provider"]');
    await page.click('[data-testid="select-option-GOOGLE"]');

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/trpc/viewer.users.update")
    );

    await page.click('button[type="submit"]');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    await page.waitForURL("/settings/admin/users");
  });
});
