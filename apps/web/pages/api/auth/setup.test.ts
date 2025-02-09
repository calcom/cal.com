import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi } from "vitest";

import handler from "./setup";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => {
      return () => key;
    },
  };
});

describe("setup", () => {
  test("should return a 400 error if users already exists", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@example.com",
        username: "test",
      },
    });

    await prismock.user.create({
      data: {
        email: "test@example.com",
      },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("should return 422 if request body is invalid", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        email: "test@example.com",
      },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(422);
  });

  test("should create a new admin user", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        username: "test",
        full_name: "Test User",
        email_address: "test@example.com",
        password: "ADMINtestingpassword123!",
      },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });
});
