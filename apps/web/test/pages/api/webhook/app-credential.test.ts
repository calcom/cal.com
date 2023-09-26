import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterAll, describe, expect, test, vi } from "vitest";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import { buildUser } from "@calcom/lib/test/builder";
import prisma from "@calcom/prisma";

import handler from "../../../../pages/api/webhook/app-credential";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/constants", () => ({
  APP_CREDENTIAL_SHARING_ENABLED: true,
}));

const originalWebhookSecret = process.env.CALCOM_WEBHOOK_SECRET;
const originalCredentialEncryptionKey = process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY;

describe("app-credential webhook", () => {
  afterAll(() => {
    process.env.CALCOM_WEBHOOK_SECRET = originalWebhookSecret;
    process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY = originalCredentialEncryptionKey;
  });
  test("Finds app by slug", async () => {
    process.env.CALCOM_WEBHOOK_SECRET = "test-secret";
    process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY = "0wiKhjWZ2LGAFV9D/p2FgnPSth+7x1gY";

    const keys = symmetricEncrypt(
      JSON.stringify({ key: "test-keys" }),
      process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY
    );

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        userId: 1,
        appSlug: "office365-calendar",
        keys,
      },
      headers: {
        "calcom-webhook-secret": "test-secret",
      },
      prisma,
    });

    prismaMock.user.findUnique.mockResolvedValue(
      buildUser({
        id: 1,
        username: "test",
        name: "Test User",
        email: "test@example.com",
      })
    );

    prismaMock.app.findUnique.mockResolvedValue({ dirName: "office365calendar" });

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._getData()).message).toBe("Credentials created for userId: 1");
  });
});
