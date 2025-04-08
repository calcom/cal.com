import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { test } from "../lib/fixtures";
import { createUserWithPrisma, deleteUserWithPrisma } from "../lib/testUtils";

test.describe("Skip Trial API", () => {
  let user: { id: number; username: string; email: string; password: string };

  test.beforeEach(async ({ page }) => {
    const username = `${uuidv4().substring(0, 8)}`;
    const email = `${username}@example.com`;
    const password = "cal-test-password";

    user = await createUserWithPrisma({
      username,
      email,
      password,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    await page.goto("/auth/login");
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.click('[type="submit"]');
    await page.waitForURL("/event-types");
  });

  test.afterEach(async () => {
    if (user) {
      await deleteUserWithPrisma(user.id);
    }
  });

  test("should skip trial when API is called", async ({ page }) => {
    await page.goto("/settings/my-account/profile");
    await expect(page.locator("text=Trial")).toBeVisible();

    const response = await page.request.post("/api/stripe/skip-trial");
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);

    await page.reload();
    await expect(page.locator("text=Trial")).toBeHidden();
  });

  test("should return 401 when not authenticated", async ({ page }) => {
    await page.goto("/auth/logout");
    await page.waitForURL("/auth/login");

    const response = await page.request.post("/api/stripe/skip-trial");
    expect(response.status()).toBe(401);
  });

  test("should return 400 when user is not on trial", async ({ page, prisma }) => {
    await prisma.user.update({
      where: { id: user.id },
      data: { trialEndsAt: null },
    });

    const response = await page.request.post("/api/stripe/skip-trial");
    expect(response.status()).toBe(400);
  });
});
