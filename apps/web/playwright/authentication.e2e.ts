import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Authentication", () => {
  test("Should be able to login with email and password", async ({ page, users }) => {
    const [user] = users.get();
    await page.goto("/auth/login");

    await page.locator('[name="email"]').fill(user.email);
    await page.locator('[name="password"]').fill(user.username || "password");
    await page.locator('[type="submit"]').click();

    await expect(page).toHaveURL("/event-types");
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
  });

  test("Should show error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    await page.locator('[name="email"]').fill("invalid@example.com");
    await page.locator('[name="password"]').fill("wrongpassword");
    await page.locator('[type="submit"]').click();

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("Should be able to logout", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/event-types");

    await page.locator('[data-testid="user-dropdown"]').click();
    await page.locator('[data-testid="logout-button"]').click();

    await expect(page).toHaveURL("/auth/login");
  });

  test("Should redirect to login when accessing protected page", async ({ page }) => {
    await page.goto("/event-types");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("Should handle forgot password flow", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator('[data-testid="forgot-password-link"]').click();

    await expect(page).toHaveURL("/auth/forgot-password");
    await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
  });

  test("Should handle signup flow", async ({ page }) => {
    await page.goto("/auth/signup");

    await page.locator('[name="username"]').fill("testuser");
    await page.locator('[name="email"]').fill("test@example.com");
    await page.locator('[name="password"]').fill("password123");
    await page.locator('[type="submit"]').click();

    await expect(page.locator('[data-testid="signup-success"]')).toBeVisible();
  });
});

test.describe("Two-Factor Authentication", () => {
  test("Should be able to enable 2FA", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();
    await page.goto("/settings/security/two-factor-auth");

    await page.locator('[data-testid="enable-2fa-button"]').click();
    await expect(page.locator('[data-testid="2fa-setup"]')).toBeVisible();
  });

  test("Should require 2FA code when enabled", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/security/two-factor-auth");
    await page.locator('[data-testid="enable-2fa-button"]').click();

    await page.goto("/auth/logout");
    await page.goto("/auth/login");

    await page.locator('[name="email"]').fill(user.email);
    await page.locator('[name="password"]').fill(user.username || "password");
    await page.locator('[type="submit"]').click();

    await expect(page.locator('[data-testid="2fa-input"]')).toBeVisible();
  });
});

test.describe("OAuth Authentication", () => {
  test("Should display OAuth login options", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.locator('[data-testid="oauth-google"]')).toBeVisible();
    await expect(page.locator('[data-testid="oauth-github"]')).toBeVisible();
  });

  test("Should handle OAuth callback", async ({ page }) => {
    await page.goto("/auth/login");

    await page.locator('[data-testid="oauth-google"]').click();
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});

test.describe("API Authentication", () => {
  test("Should require authentication for API endpoints", async ({ page }) => {
    const response = await page.request.get("/api/user");
    expect(response.status()).toBe(401);
  });

  test("Should allow authenticated API requests", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    const response = await page.request.get("/api/user");
    expect(response.status()).toBe(200);
  });

  test("Should handle API key authentication", async ({ page, users }) => {
    const [user] = users.get();
    await user.apiLogin();

    await page.goto("/settings/developer/api-keys");
    await page.locator('[data-testid="create-api-key"]').click();
    await page.locator('[name="note"]').fill("Test API Key");
    await page.locator('[data-testid="save-api-key"]').click();

    await expect(page.locator('[data-testid="api-key-created"]')).toBeVisible();
  });
});
