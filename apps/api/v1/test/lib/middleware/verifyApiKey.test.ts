import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, vi, it, expect, afterEach, beforeEach } from "vitest";

import LicenseKeyService from "@calcom/ee/common/server/LicenseKeyService";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "~/lib/utils/isAdmin";

import { verifyApiKey } from "../../../lib/helpers/verifyApiKey";
import { isLockedOrBlocked } from "../../../lib/utils/isLockedOrBlocked";
import { ScopeOfAdmin } from "../../../lib/utils/scopeOfAdmin";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

afterEach(() => {
  vi.resetAllMocks();
});

vi.mock("@calcom/prisma");
vi.mock("~/lib/utils/isAdmin", () => ({
  isAdminGuard: vi.fn(),
}));
vi.mock("../../../lib/utils/isLockedOrBlocked", () => ({
  isLockedOrBlocked: vi.fn(),
}));

describe("Verify API key", () => {
  let service: LicenseKeyService;

  beforeEach(async () => {
    service = await LicenseKeyService.create();

    vi.spyOn(service, "checkLicense");
  });

  it("should throw an error if the api key is not valid", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(false);
    vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: false, scope: null });

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();

    expect(res.statusCode).toBe(401);
  });

  it("should throw an error if no api key is provided", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);
    vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: false, scope: null });

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();

    expect(res.statusCode).toBe(401);
  });

  it("should set correct permissions for system-wide admin", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
      query: {
        apiKey: "cal_test_key",
      },
      prisma,
    });

    prismaMock.apiKey.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);
    vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: true, scope: ScopeOfAdmin.SystemWide });

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();

    expect(req.isSystemWideAdmin).toBe(true);
    expect(req.isOrganizationOwnerOrAdmin).toBe(false);
  });

  it("should set correct permissions for org-level admin", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
      query: {
        apiKey: "cal_test_key",
      },
      prisma,
    });

    prismaMock.apiKey.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);
    vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: true, scope: ScopeOfAdmin.OrgOwnerOrAdmin });

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();

    expect(req.isSystemWideAdmin).toBe(false);
    expect(req.isOrganizationOwnerOrAdmin).toBe(true);
  });

  it("should return 401 if user is locked or blocked", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
      query: {
        apiKey: "cal_test_key",
      },
      prisma,
    });

    prismaMock.apiKey.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
    });

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);
    vi.mocked(isAdminGuard).mockResolvedValue({ isAdmin: false, scope: null });
    vi.mocked(isLockedOrBlocked).mockResolvedValue(true);

    const serverNext = vi.fn((next: void) => Promise.resolve(next));
    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(isLockedOrBlocked).toHaveBeenCalledWith(expect.objectContaining({ userId: 2 }));
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res._getData())).toEqual({ error: "You are not authorized to perform this request." });
    expect(serverNext).not.toHaveBeenCalled();
  });
});
