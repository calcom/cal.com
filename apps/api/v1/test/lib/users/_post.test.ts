/**
 * Unit Tests for POST /api/users
 *
 * These tests verify the API endpoint logic without touching the database.
 * All dependencies (UserCreationService) are mocked.
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi, beforeEach } from "vitest";

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

vi.mock("@calcom/features/profile/lib/checkUsername", () => ({
  checkUsername: vi.fn().mockResolvedValue({
    available: true,
    premium: false,
  }),
}));

vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));

const mockCreate = vi.fn();
vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(function () {
    return {
      create: mockCreate,
    };
  }),
}));

vi.mock("@calcom/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("POST /api/users - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      username: "test",
      locked: false,
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
    expect(mockCreate).not.toHaveBeenCalled();
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
    expect(mockCreate).not.toHaveBeenCalled();
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
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("should create user successfully", async () => {
    mockCreate.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      username: "testuser123",
      locked: false,
      organizationId: null,
    });

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

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        username: "testuser123",
        locked: false,
      })
    );

    const responseData = JSON.parse(res._getData());
    expect(responseData.user).toEqual(
      expect.objectContaining({
        email: "test@example.com",
        username: "testuser123",
        organizationId: null,
      })
    );
  });
});
