import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi, afterAll } from "vitest";

import { prisma } from "@calcom/prisma";
import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";

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

describe("POST /api/users - Integration Tests", () => {
  // Clean up all test data after all tests complete
  afterAll(async () => {
    // Clean up test data
    // Delete in reverse order of foreign key dependencies

    // First, find all watchlist entries we need to clean
    const watchlistEntries = await prisma.watchlist.findMany({
      where: {
        value: {
          in: ["test@example.com", "locked@example.com"],
        },
      },
      select: { id: true },
    });

    const watchlistIds = watchlistEntries.map((entry) => entry.id);

    // Delete watchlist audit entries
    if (watchlistIds.length > 0) {
      await prisma.watchlistAudit.deleteMany({
        where: {
          watchlistId: {
            in: watchlistIds,
          },
        },
      });
    }

    // Delete watchlist entries
    await prisma.watchlist.deleteMany({
      where: {
        value: {
          in: ["test@example.com", "locked@example.com"],
        },
      },
    });

    // Delete test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["test@example.com", "locked@example.com"],
        },
      },
    });
  });
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
        username: "testuser123",
      },
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    // Verify response contains user data
    const responseData = JSON.parse(res._getData());
    expect(responseData.user).toEqual(
      expect.objectContaining({
        email: "test@example.com",
        username: "testuser123",
        organizationId: null,
      })
    );
  });

  test("should auto lock user if email is in watchlist", async () => {
    // Create watchlist entry in real database before test
    await prisma.watchlist.create({
      data: {
        type: WatchlistType.EMAIL,
        value: "locked@example.com",
        action: WatchlistAction.BLOCK,
        source: WatchlistSource.MANUAL,
        isGlobal: true,
        organizationId: null,
      },
    });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "locked@example.com",
        username: "lockeduser",
      },
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    // Verify response contains user data
    const responseData = JSON.parse(res._getData());
    expect(responseData.user).toEqual(
      expect.objectContaining({
        email: "locked@example.com",
        username: "lockeduser",
        organizationId: null,
      })
    );
  });
});
