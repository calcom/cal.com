import { expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import process from "node:process";

import { test } from "../lib/fixtures";
import type { PrismaClient } from "@calcom/prisma";
import jwt from "jsonwebtoken";

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
    clientType,
  }: {
    prisma: PrismaClient;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    clientType: "PUBLIC" | "CONFIDENTIAL";
  }) {
    const clientId = randomBytes(32).toString("hex");

    const client = await prisma.oAuthClient.create({
      data: {
        clientId,
        name,
        redirectUri: "https://example.com",
        clientSecret: null,
        clientType,
        status,
      },
    });

    return client;
  }

  function signRefreshToken(clientId: string, userId: number): string {
    const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new Error("CALENDSO_ENCRYPTION_KEY is not set");
    }

    return jwt.sign(
      {
        userId,
        teamId: null,
        scope: [],
        token_type: "Refresh Token",
        clientId,
      },
      secretKey,
      { expiresIn: 30 * 24 * 60 * 60 }
    );
  }

  test("legacy refresh token without secret is accepted", async ({ page, users, prisma }, testInfo) => {
    const user = await users.create({ username: "oauth-refresh-legacy" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}approved-${Date.now()}`,
      status: "APPROVED",
      clientType: "PUBLIC",
    });

    // Legacy token has no secret field — should be accepted once
    const legacyToken = signRefreshToken(client.clientId, user.id);

    const response = await page.request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: legacyToken,
      },
    });
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.access_token).toBeDefined();
    expect(json.refresh_token).toBeDefined();
  });

  test("reusing a rotated refresh token is rejected", async ({ page, users, prisma }, testInfo) => {
    const user = await users.create({ username: "oauth-refresh-rotation" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}approved-${Date.now()}`,
      status: "APPROVED",
      clientType: "PUBLIC",
    });

    // Use a legacy token to get a new-format token with a secret
    const legacyToken = signRefreshToken(client.clientId, user.id);
    const firstResponse = await page.request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: legacyToken,
      },
    });
    expect(firstResponse.status()).toBe(200);
    const newRefreshToken = (await firstResponse.json()).refresh_token;

    // Use the new token once (rotates it)
    const secondResponse = await page.request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: newRefreshToken,
      },
    });
    expect(secondResponse.status()).toBe(200);

    // Reuse the same token — should be rejected
    const reuseResponse = await page.request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: newRefreshToken,
      },
    });
    expect(reuseResponse.status()).toBe(400);

    const reuseJson = await reuseResponse.json();
    expect(reuseJson.error).toBe("invalid_grant");
    expect(reuseJson.error_description).toBe("refresh_token_revoked");
  });

  test("token refresh fails if client is not approved", async ({ page, users, prisma }, testInfo) => {
    const user = await users.create({ username: "oauth-refresh-status-check" });
    await user.apiLogin();

    const testPrefix = `e2e-oauth-refresh-status-${testInfo.testId}-`;
    const client = await createOAuthClient({
      prisma,
      name: `${testPrefix}pending-${Date.now()}`,
      status: "PENDING",
      clientType: "PUBLIC",
    });

    const refreshToken = signRefreshToken(client.clientId, user.id);

    const refreshResponse = await page.request.post("/api/auth/oauth/refreshToken", {
      form: {
        grant_type: "refresh_token",
        client_id: client.clientId,
        refresh_token: refreshToken,
      },
    });

    expect(refreshResponse.status()).toBe(401);

    const refreshJson = await refreshResponse.json();
    expect(refreshJson.error).toBe("unauthorized_client");
  });
});
