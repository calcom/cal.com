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

import { UserCreationService } from "@calcom/lib/server/service/userCreationService";
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

vi.mock("@calcom/lib/server/checkUsername", () => ({
  checkUsername: vi.fn().mockResolvedValue({
    available: true,
    premium: false,
  }),
}));

vi.mock("@calcom/lib/server/service/userCreationService", () => ({
  UserCreationService: {
    createUser: vi.fn(),
  },
}));

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("POST /api/users - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(vi.mocked(UserCreationService.createUser)).not.toHaveBeenCalled();
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
    expect(vi.mocked(UserCreationService.createUser)).not.toHaveBeenCalled();
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
    expect(vi.mocked(UserCreationService.createUser)).not.toHaveBeenCalled();
  });

  test("should create user successfully", async () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      username: "testuser123",
      organizationId: null,
    } as unknown as User;

    vi.mocked(UserCreationService.createUser).mockResolvedValue(mockUser);

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

    expect(vi.mocked(UserCreationService.createUser)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
          username: "testuser123",
        }),
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
