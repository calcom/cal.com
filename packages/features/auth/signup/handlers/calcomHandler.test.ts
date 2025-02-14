import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, vi, expect } from "vitest";

import type { RequestWithUsernameStatus } from "@calcom/lib/server/username";

import handler from "./calcomHandler";

vi.mock("@calcom/app-store/stripepayment/lib/server", () => ({
  default: {
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_123456789" }),
    },
  },
}));

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => {
      return () => key;
    },
  };
});

type CustomNextApiResponse = NextApiResponse & Response;

describe("calcomHandler", () => {
  test("should create a new user", async () => {
    const { req, res } = createMocks<NextApiRequest & Request, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@test.com",
        password: "PASSWORDpassword1!",
        username: "test",
      },
    });

    req.usernameStatus = {
      statusCode: 200,
      json: {
        available: true,
        premium: false,
      },
      requestedUserName: "test",
    };

    await handler(req as unknown as RequestWithUsernameStatus, res);

    const user = await prismock.user.findFirst({
      where: {
        email: "test@test.com",
      },
      include: {
        password: true,
      },
    });

    expect(user).toEqual(
      expect.objectContaining({
        email: "test@test.com",
        username: "test",
        locked: false,
        organizationId: null,
      })
    );

    expect(user?.password?.hash).not.toBeNull();
  });

  test("should create a locked user if domain is in watchlist", async () => {
    const { req, res } = createMocks<NextApiRequest & Request, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@blocked.com",
        password: "PASSWORDpassword1!",
        username: "test",
      },
    });

    req.usernameStatus = {
      statusCode: 200,
      json: {
        available: true,
        premium: false,
      },
      requestedUserName: "test",
    };

    await prismock.watchlist.create({
      data: {
        type: "DOMAIN",
        value: "blocked.com",
        severity: "CRITICAL",
        createdById: 1,
      },
    });

    await handler(req as unknown as RequestWithUsernameStatus, res);

    const user = await prismock.user.findFirst({
      where: {
        email: "test@blocked.com",
      },
      include: {
        password: true,
      },
    });

    expect(user).toEqual(
      expect.objectContaining({
        email: "test@blocked.com",
        username: "test",
        locked: true,
        organizationId: null,
      })
    );

    expect(user?.password?.hash).not.toBeNull();
  });
});
