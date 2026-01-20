
import { expect } from "@playwright/test";
import { randomBytes } from "node:crypto";

import { test } from "../lib/fixtures";
import type { PrismaClient } from "@calcom/prisma";

test.describe("OAuth - refresh tokens", () => {
  test.afterEach(async ({ prisma, users }, testInfo) => {
    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;

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

  test("token refresh fails if client is not approved", async ({ page, users, prisma, request }, testInfo) => {
    const user = await users.create({ username: "oauth-refresh-status-check" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;
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

    const url = new URL(page.url());
    const code = url.searchParams.get("code");
    expect(code).toBeTruthy();

    // Exchange code for tokens
    const exchangeResponse = await request.post("/api/auth/oauth/token", {
      form: {
        grant_type: "authorization_code",
        client_id: client.clientId,
        code: code!,
        redirect_uri: client.redirectUri,
      },
    });

    expect(exchangeResponse.ok()).toBeTruthy();
    const tokens = await exchangeResponse.json();
    const refreshToken = tokens.refresh_token;

    // Update client status to PENDING
    await prisma.oAuthClient.update({
      where: { clientId: client.clientId },
      data: { status: "PENDING" },
    });

    // Attempt to refresh token
    const refreshResponse = await request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: refreshToken,
      },
    });

    expect(refreshResponse.status()).toBe(400);
    
    const refreshJson = await refreshResponse.json();
    expect(refreshJson.error).toBe("unauthorized_client");
  });
});
