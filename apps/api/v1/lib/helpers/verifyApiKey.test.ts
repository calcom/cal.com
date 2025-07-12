import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ILicenseKeyService } from "@calcom/ee/common/server/LicenseKeyService";
import LicenseKeyService from "@calcom/ee/common/server/LicenseKeyService";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import type { IDeploymentRepository } from "@calcom/lib/server/repository/deployment.interface";
import prisma from "@calcom/prisma";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";

import { verifyApiKey } from "./verifyApiKey";

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
  getLicenseKeyWithId: vi.fn().mockResolvedValue("mockLicenseKey"), // Mocked return value
  getSignatureToken: vi.fn().mockResolvedValue("mockSignatureToken"),
};

describe("Verify API key", () => {
  let service: ILicenseKeyService;

  beforeEach(async () => {
    service = await LicenseKeyService.create(mockDeploymentRepository);

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
      prisma,
    });
    const hashedKey = hashAPIKey("test_key");
    await prismock.apiKey.create({
      data: {
        hashedKey,
        user: {
          create: {
            email: "admin@example.com",
            role: UserPermissionRole.ADMIN,
            locked: false,
          },
        },
      },
    });

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
      prisma,
    });
    const hashedKey = hashAPIKey("test_key");
    await prismock.apiKey.create({
      data: {
        hashedKey,
        user: {
          create: {
            email: "org-admin@acme.com",
            role: UserPermissionRole.USER,
            locked: false,
            teams: {
              create: {
                accepted: true,
                role: MembershipRole.OWNER,
                team: {
                  create: {
                    name: "ACME",
                    isOrganization: true,
                    organizationSettings: {
                      create: {
                        isAdminAPIEnabled: true,
                        orgAutoAcceptEmail: "acme.com",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

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
      prisma,
    });
    const hashedKey = hashAPIKey("test_key");
    await prismock.apiKey.create({
      data: {
        hashedKey,
        user: {
          create: {
            email: "locked@example.com",
            role: UserPermissionRole.USER,
            locked: true,
          },
        },
      },
    });

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
