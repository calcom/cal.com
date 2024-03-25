import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, vi, it, expect, afterEach } from "vitest";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";

import { isAdminGuard } from "~/lib/utils/isAdmin";

import { verifyApiKey } from "../../../lib/helpers/verifyApiKey";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

afterEach(() => {
  vi.resetAllMocks();
});

vi.mock("@calcom/features/ee/common/server/checkLicense", () => {
  return {
    default: vi.fn(),
  };
});

vi.mock("~/lib/utils/isAdmin", () => {
  return {
    isAdminGuard: vi.fn(),
  };
});

describe("Verify API key", () => {
  it("It should throw an error if the api key is not valid", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(checkLicense).mockResolvedValue(false);
    vi.mocked(isAdminGuard).mockResolvedValue(false);

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(res.statusCode).toBe(401);
  });
  it("It should thow an error if no api key is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(checkLicense).mockResolvedValue(true);
    vi.mocked(isAdminGuard).mockResolvedValue(false);

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(res.statusCode).toBe(401);
  });
});
