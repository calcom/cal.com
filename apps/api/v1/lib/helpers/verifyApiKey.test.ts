/**
 * Unit Tests for verifyApiKey middleware
 *
 * These tests verify the middleware logic without touching the database.
 * All dependencies (repositories, utilities) are mocked.
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ILicenseKeyService } from "@calcom/ee/common/server/LicenseKeyService";
import LicenseKeyService from "@calcom/ee/common/server/LicenseKeyService";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import type { IDeploymentRepository } from "@calcom/lib/server/repository/deployment.interface";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { isAdminGuard } from "../utils/isAdmin";
import { isLockedOrBlocked } from "../utils/isLockedOrBlocked";
import { ScopeOfAdmin } from "../utils/scopeOfAdmin";
import { verifyApiKey } from "./verifyApiKey";

vi.mock("@calcom/lib/server/repository/apikey", () => ({
  PrismaApiKeyRepository: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
    },
    deployment: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../utils/isAdmin", () => ({
  isAdminGuard: vi.fn(),
}));

vi.mock("../utils/isLockedOrBlocked", () => ({
  isLockedOrBlocked: vi.fn(),
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockReturnValue("mocked-decrypted-value"),
  symmetricEncrypt: vi.fn().mockReturnValue("mocked-encrypted-value"),
}));

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

beforeEach(() => {
  vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "22gfxhWUlcKliUeXcu8xNah2+HP/29ZX");
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

const mockDeploymentRepository: IDeploymentRepository = {
  getLicenseKeyWithId: vi.fn().mockResolvedValue("mockLicenseKey"),
  getSignatureToken: vi.fn().mockResolvedValue("mockSignatureToken"),
};

describe("Verify API key - Unit Tests", () => {
  let service: ILicenseKeyService;

  beforeEach(async () => {
    service = await LicenseKeyService.create(mockDeploymentRepository);
    vi.spyOn(service, "checkLicense");

    vi.mocked(prisma.apiKey.findUnique).mockReset();
    vi.mocked(prisma.deployment.findUnique).mockReset();
    vi.mocked(isAdminGuard).mockReset();
    vi.mocked(isLockedOrBlocked).mockReset();

    vi.mocked(prisma.deployment.findUnique).mockResolvedValue(null);
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
    });

    const hashedKey = hashAPIKey("test_key");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "api-key-1",
      userId: 1,
      hashedKey,
      expiresAt: null,
      createdAt: new Date(),
      lastUsedAt: null,
      appId: null,
      note: null,
      teamId: null,
      user: {
        role: UserPermissionRole.ADMIN,
        locked: false,
        email: "admin@example.com",
      },
    } as unknown as ReturnType<typeof prisma.apiKey.findUnique> extends Promise<infer T> ? T : never);

    vi.mocked(isAdminGuard).mockResolvedValue({
      isAdmin: true,
      scope: ScopeOfAdmin.SystemWide,
    });

    vi.mocked(isLockedOrBlocked).mockResolvedValue(false);

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);

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
    });

    const hashedKey = hashAPIKey("test_key");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "api-key-2",
      userId: 2,
      hashedKey,
      expiresAt: null,
      createdAt: new Date(),
      lastUsedAt: null,
      appId: null,
      note: null,
      teamId: null,
      user: {
        role: UserPermissionRole.USER,
        locked: false,
        email: "org-admin@acme.com",
      },
    } as unknown as ReturnType<typeof prisma.apiKey.findUnique> extends Promise<infer T> ? T : never);

    vi.mocked(isAdminGuard).mockResolvedValue({
      isAdmin: true,
      scope: ScopeOfAdmin.OrgOwnerOrAdmin,
    });

    vi.mocked(isLockedOrBlocked).mockResolvedValue(false);

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();

    expect(req.isSystemWideAdmin).toBe(false);
    expect(req.isOrganizationOwnerOrAdmin).toBe(true);
  });

  it("should return 403 if user is locked or blocked", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
      query: {
        apiKey: "cal_test_key",
      },
    });

    const hashedKey = hashAPIKey("test_key");

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "api-key-3",
      userId: 3,
      hashedKey,
      expiresAt: null,
      createdAt: new Date(),
      lastUsedAt: null,
      appId: null,
      note: null,
      teamId: null,
      user: {
        role: UserPermissionRole.USER,
        locked: true,
        email: "locked@example.com",
      },
    } as unknown as ReturnType<typeof prisma.apiKey.findUnique> extends Promise<infer T> ? T : never);

    vi.mocked(isAdminGuard).mockResolvedValue({
      isAdmin: false,
      scope: ScopeOfAdmin.SystemWide,
    });

    vi.mocked(isLockedOrBlocked).mockResolvedValue(true);

    const middleware = {
      fn: verifyApiKey,
    };

    vi.mocked(service.checkLicense).mockResolvedValue(true);

    const serverNext = vi.fn((next: void) => Promise.resolve(next));
    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res._getData())).toEqual({ error: "You are not authorized to perform this request." });
    expect(serverNext).not.toHaveBeenCalled();
  });
});
