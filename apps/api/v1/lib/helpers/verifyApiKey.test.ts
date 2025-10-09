import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ILicenseKeyService } from "@calcom/ee/common/server/LicenseKeyService";
import LicenseKeyService from "@calcom/ee/common/server/LicenseKeyService";
import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import type { WatchlistFeature } from "@calcom/features/watchlist/lib/facade/WatchlistFeature";
import type { IDeploymentRepository } from "@calcom/lib/server/repository/deployment.interface";
import { prisma } from "@calcom/prisma";
import type { ApiKey, User, Membership } from "@calcom/prisma/client";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";

import { verifyApiKey } from "./verifyApiKey";

// Use production types directly

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockReturnValue("mocked-decrypted-value"),
  symmetricEncrypt: vi.fn().mockReturnValue("mocked-encrypted-value"),
}));

// Mock the watchlist feature to return controlled responses
vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getWatchlistFeature: vi.fn(),
}));

// Mock prisma for API key and user queries
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    apiKey: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    deployment: {
      findUnique: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

type CustomNextApiRequest = NextApiRequest &
  Request & {
    isSystemWideAdmin?: boolean;
    isOrganizationOwnerOrAdmin?: boolean;
  };
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
    });
    const hashedKey = hashAPIKey("test_key");

    // Mock API key lookup for admin user
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "test-api-key-id",
      hashedKey,
      userId: 123,
      user: {
        id: 123,
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
        locked: false,
        memberships: [],
      },
    } as unknown as ApiKey);

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 123,
      email: "admin@example.com",
      role: UserPermissionRole.ADMIN,
      locked: false,
      memberships: [],
    } as unknown as User);

    // Mock watchlist feature (admin won't be blocked)
    const mockWatchlistFeature = {
      globalBlocking: {
        isBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
      orgBlocking: {
        isEmailBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
    } as unknown as WatchlistFeature;
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature);

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

    // Mock API key lookup for org admin user
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "test-api-key-id",
      hashedKey,
      userId: 123,
      user: {
        id: 123,
        email: "org-admin@acme.com",
        role: UserPermissionRole.USER,
        locked: false,
        memberships: [
          {
            accepted: true,
            role: MembershipRole.OWNER,
            team: {
              id: 1,
              name: "ACME",
              isOrganization: true,
              organizationSettings: {
                isAdminAPIEnabled: true,
                orgAutoAcceptEmail: "acme.com",
              },
            },
          },
        ],
      },
    } as unknown as ApiKey);

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 123,
      email: "org-admin@acme.com",
      role: UserPermissionRole.USER,
      locked: false,
      memberships: [
        {
          accepted: true,
          role: MembershipRole.OWNER,
          team: {
            id: 1,
            name: "ACME",
            isOrganization: true,
            organizationSettings: {
              isAdminAPIEnabled: true,
              orgAutoAcceptEmail: "acme.com",
            },
          },
        },
      ],
    } as unknown as User);

    // Mock membership lookup for org admin
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      {
        accepted: true,
        role: MembershipRole.OWNER,
        team: {
          id: 1,
          name: "ACME",
          isOrganization: true,
          organizationSettings: {
            isAdminAPIEnabled: true,
            orgAutoAcceptEmail: "acme.com",
          },
        },
      },
    ] as unknown as Membership[]);

    // Mock watchlist feature (org admin won't be blocked)
    const mockWatchlistFeature = {
      globalBlocking: {
        isBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
      orgBlocking: {
        isEmailBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
    } as unknown as WatchlistFeature;
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature);

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

    // Mock API key lookup with locked user
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "test-api-key-id",
      hashedKey,
      userId: 123,
      user: {
        id: 123,
        email: "locked@example.com",
        role: UserPermissionRole.USER,
        locked: true, // User is locked
        memberships: [],
      },
    } as unknown as ApiKey);

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 123,
      email: "locked@example.com",
      role: UserPermissionRole.USER,
      locked: true,
      memberships: [],
    } as unknown as User);

    // Mock membership lookup (empty for locked user)
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);

    // Mock watchlist feature (won't be called since user is already locked)
    const mockWatchlistFeature = {
      globalBlocking: {
        isBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
      orgBlocking: {
        isEmailBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
    } as unknown as WatchlistFeature;
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature);

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

  it("should return 403 if user email is in watchlist", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
      query: {
        apiKey: "cal_test_key",
      },
    });
    const hashedKey = hashAPIKey("test_key");

    // Mock API key lookup
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "test-api-key-id",
      hashedKey,
      userId: 123,
      user: {
        id: 123,
        email: "blocked@example.com",
        role: UserPermissionRole.USER,
        locked: false, // Not locked, but will be blocked by watchlist
        memberships: [],
      },
    } as unknown as ApiKey);

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 123,
      email: "blocked@example.com",
      role: UserPermissionRole.USER,
      locked: false,
      memberships: [],
    } as unknown as User);

    // Mock membership lookup (empty for regular user)
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);

    // Mock watchlist feature to return blocked result
    const mockWatchlistFeature = {
      globalBlocking: {
        isBlocked: vi.fn().mockResolvedValue({ isBlocked: true }),
      },
      orgBlocking: {
        isEmailBlocked: vi.fn().mockResolvedValue({ isBlocked: false }),
      },
    } as unknown as WatchlistFeature;
    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature);

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

    // Verify watchlist was checked
    expect(mockWatchlistFeature.globalBlocking.isBlocked).toHaveBeenCalledWith(
      "blocked@example.com",
      undefined
    );
  });
});
