import { expect } from "@playwright/test";
import { randomBytes } from "node:crypto";

import { OAUTH_ERROR_REASONS } from "@calcom/features/oauth/services/OAuthService";
import type { PrismaClient } from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.describe("OAuth authorize - client approval status", () => {
  test.afterEach(async ({ prisma, users }, testInfo) => {
    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;

    await prisma.oAuthClient.deleteMany({
      where: {
        name: {
          startsWith: testPrefix,
        },
      },
    });

    await users.deleteAll();
  });

  async function createOAuthClient({
    prisma,
    name,
    status,
  }: {
    prisma: PrismaClient;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
  }) {
    const clientId = randomBytes(32).toString("hex");

    const client = await prisma.oAuthClient.create({
      data: {
        clientId,
        name,
        redirectUri: "https://example.com",
        clientSecret: null,
        clientType: "CONFIDENTIAL",
        status,
      },
    });

    return client;
  }

  test("PENDING client renders error on authorize page (no redirect)", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-pending" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}pending-${Date.now()}`,
      status: "PENDING",
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&state=1234`
    );

    // Should NOT redirect, should show error on page
    await expect(page).not.toHaveURL(/^https:\/\/example\.com/);

    // Check error message is displayed
    await expect(page.getByText(OAUTH_ERROR_REASONS["client_not_approved"])).toBeVisible();
  });

  test("REJECTED client renders error on authorize page (no redirect)", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-rejected" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}rejected-${Date.now()}`,
      status: "REJECTED",
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&state=1234`
    );

    // Should NOT redirect, should show error on page
    await expect(page).not.toHaveURL(/^https:\/\/example\.com/);

    // Check error message is displayed
    await expect(page.getByText(OAUTH_ERROR_REASONS["client_not_approved"])).toBeVisible();
  });

  test("APPROVED client redirects to redirectUri with code", async ({ page, users, prisma }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-approved" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}approved-${Date.now()}`,
      status: "APPROVED",
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&state=1234`
    );

    await page.waitForSelector('[data-testid="allow-button"]');
    await page.getByTestId("allow-button").click();

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    await expect(page).toHaveURL(/^https:\/\/example\.com/);

    const url = new URL(page.url());
    expect(url.searchParams.get("code")).toBeTruthy();
    expect(url.searchParams.get("state")).toBe("1234");
    expect(url.searchParams.get("error")).toBeNull();
  });

  test("redirect_uri mismatch renders error on authorize page (no redirect)", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-redirect-uri-mismatch" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}mismatch-${Date.now()}`,
      status: "APPROVED",
    });

    const mismatchedRedirectUri = "https://example.com/mismatch";

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${encodeURIComponent(
        mismatchedRedirectUri
      )}&state=1234`
    );

    await expect(page).toHaveURL(/\/auth\/oauth2\/authorize/);
    await expect(page.getByText(OAUTH_ERROR_REASONS["redirect_uri_mismatch"])).toBeVisible();
  });

  test("invalid client_id renders error on authorize page (no redirect)", async ({ page, users }) => {
    const user = await users.create({ username: "oauth-authorize-invalid-client" });
    await user.apiLogin();

    const invalidClientId = "invalid-client-id-" + Date.now();
    const redirectUri = "https://example.com";

    await page.goto(
      `auth/oauth2/authorize?client_id=${invalidClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=1234`
    );

    await expect(page).toHaveURL(/\/auth\/oauth2\/authorize/);
    await expect(page.getByText(OAUTH_ERROR_REASONS["client_not_found"])).toBeVisible();
  });
});
