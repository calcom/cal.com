import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi } from "vitest";

import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/features/watchlist/lib/types";

import handler from "../../../pages/api/users/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => {
      return () => key;
    },
  };
});

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("POST /api/users", () => {
  test("should throw 401 if not system-wide admin", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@example.com",
        username: "test",
      },
    });
    req.isSystemWideAdmin = false;

    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });
  test("should throw a 400 if no email is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        username: "test",
      },
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
  test("should throw a 400 if no username is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@example.com",
      },
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
  test("should create user successfully", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@example.com",
        username: "test",
      },
      prisma: prismock,
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    const userQuery = await prismock.user.findFirst({
      where: {
        email: "test@example.com",
      },
    });

    expect(userQuery).toEqual(
      expect.objectContaining({
        email: "test@example.com",
        username: "test",
        locked: false,
        organizationId: null,
      })
    );
  });

  test("should auto lock user if email is in watchlist", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "testuser@example.com",
        username: "testuser",
      },
      prisma: prismock,
    });
    req.isSystemWideAdmin = true;

    await prismock.watchlist.create({
      data: {
        type: WatchlistType.EMAIL,
        value: "testuser@example.com",
        action: WatchlistAction.BLOCK,
        isGlobal: true,
        organizationId: null,
        source: WatchlistSource.MANUAL,
      },
    });
    await handler(req, res);

    expect(res.statusCode).toBe(200);

    const userQuery = await prismock.user.findFirst({
      where: {
        email: "testuser@example.com",
      },
    });

    expect(userQuery).toEqual(
      expect.objectContaining({
        email: "testuser@example.com",
        username: "testuser",
        locked: true,
        organizationId: null,
      })
    );
  });
});
