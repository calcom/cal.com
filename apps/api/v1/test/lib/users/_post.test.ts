import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi, beforeEach } from "vitest";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type { WatchlistFeature } from "@calcom/features/watchlist/lib/facade/WatchlistFeature";
import type { User } from "@calcom/prisma/client";

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

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getWatchlistFeature: vi.fn(),
}));

const mockUserRepository = {
  create: vi.fn(),
};

vi.mock("@calcom/lib/server/repository/user", () => ({
  UserRepository: vi.fn().mockImplementation(() => mockUserRepository),
}));

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("POST /api/users", () => {
  let mockWatchlistFeature: WatchlistFeature;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup watchlist feature mock
    const mockGlobalBlocking = {
      isBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
    };
    const mockOrgBlocking = {
      isBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
    };

    mockWatchlistFeature = {
      globalBlocking: mockGlobalBlocking,
      orgBlocking: mockOrgBlocking,
    } as unknown as WatchlistFeature;

    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature);
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
    const mockUser = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      locked: false,
      organizationId: null,
    } as unknown as User;

    mockUserRepository.create.mockResolvedValue(mockUser);

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@example.com",
        username: "testuser",
      },
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    // Verify UserRepository.create was called with correct data
    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        username: "testuser",
        locked: false,
        organizationId: null,
      })
    );

    // Verify response contains user (without locked field)
    const responseData = JSON.parse(res._getData());
    expect(responseData.user).toEqual(
      expect.objectContaining({
        email: "test@example.com",
        username: "testuser",
      })
    );
    expect(responseData.user).not.toHaveProperty("locked");
  });

  test("should auto lock user if email is in watchlist", async () => {
    // Mock watchlist to return blocked
    vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked).mockResolvedValue({ isBlocked: true });

    const mockLockedUser = {
      id: 2,
      email: "testuser@example.com",
      username: "testuser",
      locked: true,
      organizationId: null,
    } as unknown as User;

    mockUserRepository.create.mockResolvedValue(mockLockedUser);

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "testuser@example.com",
        username: "testuser",
      },
    });
    req.isSystemWideAdmin = true;

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    // Verify watchlist was checked
    expect(mockWatchlistFeature.globalBlocking.isBlocked).toHaveBeenCalledWith("testuser@example.com");

    // Verify user was created with locked: true
    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "testuser@example.com",
        username: "testuser",
        locked: true,
        organizationId: null,
      })
    );

    // Verify response contains user (without locked field)
    const responseData = JSON.parse(res._getData());
    expect(responseData.user).toEqual(
      expect.objectContaining({
        email: "testuser@example.com",
        username: "testuser",
      })
    );
    expect(responseData.user).not.toHaveProperty("locked");
  });
});
