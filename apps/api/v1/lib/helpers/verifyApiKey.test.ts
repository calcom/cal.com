/**
 * Unit Tests for verifyApiKey middleware
 *
 * These tests verify the middleware logic without touching the database.
 * All dependencies (repositories, utilities) are mocked.
 */

import type { ILicenseKeyService } from "@calcom/ee/common/server/LicenseKeyService";
import LicenseKeyService, { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { PrismaApiKeyRepository } from "@calcom/features/ee/api-keys/repositories/PrismaApiKeyRepository";
import { ApiKeyService } from "@calcom/features/ee/api-keys/services/ApiKeyService";
import type { IDeploymentRepository } from "@calcom/features/ee/deployment/repositories/IDeploymentRepository";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAdminGuard } from "../utils/isAdmin";
import { isLockedOrBlocked } from "../utils/isLockedOrBlocked";
import { ScopeOfAdmin } from "../utils/scopeOfAdmin";
import { verifyApiKey } from "./verifyApiKey";

vi.mock("@calcom/features/ee/api-keys/services/ApiKeyService", () => ({
  ApiKeyService: vi.fn(),
}));

vi.mock("@calcom/features/ee/api-keys/repositories/PrismaApiKeyRepository", () => ({
  PrismaApiKeyRepository: vi.fn(),
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
  let mockApiKeyService: ApiKeyService;

  beforeEach(async () => {
    service = await LicenseKeyService.create(mockDeploymentRepository);
    vi.spyOn(service, "checkLicense");

    vi.spyOn(LicenseKeySingleton, "getInstance").mockResolvedValue(service as LicenseKeyService);

    mockApiKeyService = {
      verifyKeyByHashedKey: vi.fn(),
    } as unknown as ApiKeyService;

    vi.mocked(ApiKeyService).mockImplementation(function () {
      return mockApiKeyService;
    });
    vi.mocked(PrismaApiKeyRepository).mockImplementation(function () {
      return {} as unknown as PrismaApiKeyRepository;
    });

    vi.mocked(isAdminGuard).mockReset();
    vi.mocked(isLockedOrBlocked).mockReset();
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

    vi.mocked(mockApiKeyService.verifyKeyByHashedKey).mockResolvedValue({
      valid: true,
      userId: 1,
      user: {
        uuid: "test-uuid-1",
        role: UserPermissionRole.ADMIN,
        locked: false,
        email: "admin@example.com",
      },
    });

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

    vi.mocked(mockApiKeyService.verifyKeyByHashedKey).mockResolvedValue({
      valid: true,
      userId: 2,
      user: {
        uuid: "test-uuid-2",
        role: UserPermissionRole.USER,
        locked: false,
        email: "org-admin@acme.com",
      },
    });

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

    vi.mocked(mockApiKeyService.verifyKeyByHashedKey).mockResolvedValue({
      valid: true,
      userId: 3,
      user: {
        uuid: "test-uuid-3",
        role: UserPermissionRole.USER,
        locked: true,
        email: "locked@example.com",
      },
    });

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
