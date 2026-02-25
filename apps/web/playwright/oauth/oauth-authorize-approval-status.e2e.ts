import { randomBytes } from "node:crypto";
import { OAUTH_ERROR_REASONS } from "@calcom/features/oauth/services/OAuthService";
import type { PrismaClient } from "@calcom/prisma";
import type { AccessScope } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
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
    userId,
    scopes,
  }: {
    prisma: PrismaClient;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    userId?: number;
    scopes?: AccessScope[];
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
        ...(userId && { user: { connect: { id: userId } } }),
        ...(scopes && { scopes }),
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

    await expect(page).not.toHaveURL(/^https:\/\/example\.com/);
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

    await expect(page).not.toHaveURL(/^https:\/\/example\.com/);

    await expect(page.getByText(OAUTH_ERROR_REASONS["client_rejected"])).toBeVisible();
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

  test("PENDING client owned by logged-in user allows authorization", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-pending-owner" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}pending-owner-${Date.now()}`,
      status: "PENDING",
      userId: user.id,
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

  test("REJECTED client owned by logged-in user blocks authorization", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-rejected-owner" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}rejected-owner-${Date.now()}`,
      status: "REJECTED",
      userId: user.id,
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&state=1234`
    );

    await expect(page).not.toHaveURL(/^https:\/\/example\.com/);

    await expect(page.getByText(OAUTH_ERROR_REASONS["client_rejected"])).toBeVisible();
  });

  test("scope exceeding client registration redirects with invalid_scope error", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-scope-exceed" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}scope-exceed-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=BOOKING_READ,SCHEDULE_WRITE&state=1234`
    );

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    await expect(page).toHaveURL(/^https:\/\/example\.com/);

    const url = new URL(page.url());
    expect(url.searchParams.get("error")).toBe("invalid_request");
    expect(url.searchParams.get("error_description")).toBe(
      OAUTH_ERROR_REASONS["scope_exceeds_client_registration"]
    );
    expect(url.searchParams.get("state")).toBe("1234");
    expect(url.searchParams.get("code")).toBeNull();
  });

  test("scope exceeding client registration with space delimiter redirects with invalid_scope error", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-scope-space" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}scope-space-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=BOOKING_READ%20SCHEDULE_WRITE&state=1234`
    );

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    await expect(page).toHaveURL(/^https:\/\/example\.com/);

    const url = new URL(page.url());
    expect(url.searchParams.get("error")).toBe("invalid_request");
    expect(url.searchParams.get("error_description")).toBe(
      OAUTH_ERROR_REASONS["scope_exceeds_client_registration"]
    );
    expect(url.searchParams.get("state")).toBe("1234");
    expect(url.searchParams.get("code")).toBeNull();
  });

  test("scope within client registration succeeds with authorization code", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-scope-valid" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}scope-valid-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ", "BOOKING_WRITE", "SCHEDULE_READ"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=BOOKING_READ&state=1234`
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

  test("consent screen displays correct scope labels for requested permissions", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-scope-display" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}scope-display-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ", "BOOKING_WRITE", "SCHEDULE_READ", "PROFILE_READ"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=BOOKING_READ,SCHEDULE_READ&state=1234`
    );

    await page.waitForSelector('[data-testid="allow-button"]');

    await expect(page.getByTestId("scope-permissions-list")).toBeVisible();
    await expect(page.getByTestId("legacy-permissions-list")).not.toBeVisible();

    await expect(page.getByText("View bookings")).toBeVisible();
    await expect(page.getByText("View availability")).toBeVisible();

    await expect(page.getByText("Create, edit, and delete bookings")).not.toBeVisible();
    await expect(page.getByText("View personal info and primary email address")).not.toBeVisible();

    await page.getByTestId("allow-button").click();

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    const url = new URL(page.url());
    expect(url.searchParams.get("code")).toBeTruthy();
  });

  test("legacy OAuth client renders legacy permissions list", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-legacy-permissions" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}legacy-${Date.now()}`,
      status: "APPROVED",
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&state=1234`
    );

    await page.waitForSelector('[data-testid="allow-button"]');

    await expect(page.getByTestId("legacy-permissions-list")).toBeVisible();
    await expect(page.getByTestId("scope-permissions-list")).not.toBeVisible();
  });

  test("new OAuth client without scope param renders error on authorize page (no redirect)", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-scope-required" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}scope-required-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&state=1234`
    );

    await expect(page).toHaveURL(/\/auth\/oauth2\/authorize/);
    await expect(page.getByText(OAUTH_ERROR_REASONS["scope_required"])).toBeVisible();
  });

  test("new OAuth client with unknown scope redirects with invalid_scope error", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-unknown-scope" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}unknown-scope-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=blab_blab&state=1234`
    );

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    await expect(page).toHaveURL(/^https:\/\/example\.com/);

    const url = new URL(page.url());
    expect(url.searchParams.get("error")).toBe("invalid_request");
    expect(url.searchParams.get("error_description")).toBe(OAUTH_ERROR_REASONS["unknown_scope"]);
    expect(url.searchParams.get("state")).toBe("1234");
    expect(url.searchParams.get("code")).toBeNull();
  });

  test("legacy OAuth client with unknown scope redirects with invalid_scope error", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-legacy-unknown-scope" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}legacy-unknown-scope-${Date.now()}`,
      status: "APPROVED",
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=blab_blab&state=1234`
    );

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    await expect(page).toHaveURL(/^https:\/\/example\.com/);

    const url = new URL(page.url());
    expect(url.searchParams.get("error")).toBe("invalid_request");
    expect(url.searchParams.get("error_description")).toBe(OAUTH_ERROR_REASONS["unknown_scope"]);
    expect(url.searchParams.get("state")).toBe("1234");
    expect(url.searchParams.get("code")).toBeNull();
  });

  test("consent screen displays merged scope labels when both read and write are requested", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    const user = await users.create({ username: "oauth-authorize-scope-merged" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-authorize-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}scope-merged-${Date.now()}`,
      status: "APPROVED",
      scopes: ["BOOKING_READ", "BOOKING_WRITE", "SCHEDULE_READ", "SCHEDULE_WRITE"],
    });

    await page.goto(
      `auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&scope=BOOKING_READ,BOOKING_WRITE&state=1234`
    );

    await page.waitForSelector('[data-testid="allow-button"]');

    await expect(page.getByTestId("scope-permissions-list")).toBeVisible();
    await expect(page.getByTestId("legacy-permissions-list")).not.toBeVisible();

    await expect(page.getByText("Create, read, update, and delete bookings")).toBeVisible();

    await expect(page.getByText("View bookings")).not.toBeVisible();
    await expect(page.getByText("Create, edit, and delete bookings")).not.toBeVisible();

    await page.getByTestId("allow-button").click();

    await page.waitForFunction(() => {
      return window.location.href.startsWith("https://example.com");
    });

    const url = new URL(page.url());
    expect(url.searchParams.get("code")).toBeTruthy();
  });
});
