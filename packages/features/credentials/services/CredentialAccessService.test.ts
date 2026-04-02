import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CredentialAccessService } from "./CredentialAccessService";

vi.mock("@calcom/prisma", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("@calcom/features/credentials/repositories/CredentialRepository", () => {
  return {
    CredentialRepository: {
      findFirstByIdWithKeyAndUser: vi.fn(),
    },
  };
});

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(function () {
      return {
        getUserOrganizationAndTeams: vi.fn(),
      };
    }),
  };
});

describe("CredentialAccessService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should allow access when credential belongs to logged-in user", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: loggedInUserId,
      teamId: null,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: { email: "user@example.com" },
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const service = new CredentialAccessService();
    await expect(
      service.ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
    ).resolves.not.toThrow();
  });

  test("should allow access when credential belongs to booking owner", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: bookingOwnerId,
      teamId: null,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: { email: "owner@example.com" },
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const service = new CredentialAccessService();
    await expect(
      service.ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
    ).resolves.not.toThrow();
  });

  test("should allow access when credential belongs to team the logged-in user belongs to", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;
    const teamId = 50;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: null,
      teamId: teamId,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: null,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const mockUserRepo = {
      getUserOrganizationAndTeams: vi.fn().mockResolvedValue({
        organizationId: null,
        teams: [{ teamId: teamId }],
      }),
    };

    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    });

    const service = new CredentialAccessService();
    await expect(
      service.ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
    ).resolves.not.toThrow();
  });

  test("should allow access when credential belongs to team the booking owner belongs to", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;
    const teamId = 50;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: null,
      teamId: teamId,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: null,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const mockUserRepo = {
      getUserOrganizationAndTeams: vi
        .fn()
        .mockResolvedValueOnce({
          organizationId: null,
          teams: [],
        })
        .mockResolvedValueOnce({
          organizationId: null,
          teams: [{ teamId: teamId }],
        }),
    };

    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    });

    const service = new CredentialAccessService();
    await expect(
      service.ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
    ).resolves.not.toThrow();
  });

  test("should allow access when credential belongs to organization the logged-in user belongs to", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;
    const orgId = 50;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: null,
      teamId: orgId,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: null,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const mockUserRepo = {
      getUserOrganizationAndTeams: vi.fn().mockResolvedValue({
        organizationId: orgId,
        teams: [],
      }),
    };

    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    });

    const service = new CredentialAccessService();
    await expect(
      service.ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
    ).resolves.not.toThrow();
  });

  test("should throw NOT_FOUND when credential does not exist", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue(null);

    const service = new CredentialAccessService();
    const error = await service
      .ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Credential not found");
  });

  test("should throw FORBIDDEN when credential is not accessible", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = 200;
    const otherUserId = 300;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: otherUserId,
      teamId: null,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: { email: "other@example.com" },
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const mockUserRepo = {
      getUserOrganizationAndTeams: vi
        .fn()
        .mockResolvedValueOnce({
          organizationId: null,
          teams: [],
        })
        .mockResolvedValueOnce({
          organizationId: null,
          teams: [],
        }),
    };

    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    });

    const service = new CredentialAccessService();
    const error = await service
      .ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("You do not have access to this credential");
  });

  test("should handle null bookingOwnerId", async () => {
    const credentialId = 1;
    const loggedInUserId = 100;
    const bookingOwnerId = null;

    vi.mocked(CredentialRepository.findFirstByIdWithKeyAndUser).mockResolvedValue({
      id: credentialId,
      userId: loggedInUserId,
      teamId: null,
      type: "zoom_video",
      appId: "zoom",
      key: {},
      invalid: false,
      user: { email: "user@example.com" },
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    } as any);

    const service = new CredentialAccessService();
    await expect(
      service.ensureAccessible({
        credentialId,
        loggedInUserId,
        bookingOwnerId,
      })
    ).resolves.not.toThrow();
  });
});
