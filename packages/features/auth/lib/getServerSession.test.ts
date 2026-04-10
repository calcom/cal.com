import type { NextApiRequest } from "next";
import type { RequestMethod } from "node-mocks-http";
import { createMocks } from "node-mocks-http";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to import mocks before vi.mock hoisting
const {
  prismaMock,
  resetPrismaMock,
  createLoggerMock,
  createPrismaMock,
  createLicenseKeyMock,
  createDeploymentRepositoryMock,
  createUserRepositoryMock,
  createAvatarUrlMock,
  createSafeStringifyMock,
  createGetTokenMock,
  createMockUser,
  createMockToken,
}: typeof import("../__mocks__/getServerSession.mocks") = await vi.hoisted(
  async () => await import("../__mocks__/getServerSession.mocks")
);

vi.mock("@calcom/lib/logger", createLoggerMock);
vi.mock("@calcom/prisma", createPrismaMock);
vi.mock("@calcom/ee/common/server/LicenseKeyService", createLicenseKeyMock);
vi.mock("@calcom/features/ee/deployment/repositories/DeploymentRepository", createDeploymentRepositoryMock);
vi.mock("@calcom/features/users/repositories/UserRepository", createUserRepositoryMock);
vi.mock("@calcom/lib/getAvatarUrl", createAvatarUrlMock);
vi.mock("@calcom/lib/safeStringify", createSafeStringifyMock);
vi.mock("next-auth/jwt", createGetTokenMock);

import { getToken } from "next-auth/jwt";
import { clearSessionCache, getServerSession } from "./getServerSession";

type MockNextApiRequest = ReturnType<typeof createMocks<NextApiRequest>>["req"];

function createMockRequest(method: RequestMethod = "GET"): MockNextApiRequest {
  const { req } = createMocks<NextApiRequest>({ method });
  return req;
}

function setupGetTokenMock(tokenData: object | null): void {
  vi.mocked(getToken).mockResolvedValue(tokenData as Record<string, unknown> | null);
}

describe("getServerSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrismaMock();
    clearSessionCache();
  });

  describe("Token Validation", () => {
    it.each([
      ["no token", null],
      ["no email", { sub: "5" }],
      ["no sub", { email: "user@example.com" }],
    ])("returns null when token is invalid: %s", async (_, token) => {
      setupGetTokenMock(token);

      const result = await getServerSession({ req: createMockRequest() });
      expect(result).toBeNull();
    });
  });

  describe("User ID Validation", () => {
    it.each(["", "invalid", "0", "-1"])("returns null when token.sub is invalid (%s)", async (sub) => {
      setupGetTokenMock(createMockToken({ sub }));

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toBeNull();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("User Lookup", () => {
    it("looks up user by ID from token.sub", async () => {
      const mockUser = createMockUser({ id: 123 });
      setupGetTokenMock(createMockToken({ sub: "123" }));
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await getServerSession({ req: createMockRequest() });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 123 },
          select: expect.any(Object),
        })
      );
    });

    it("returns null when user not found in database", async () => {
      setupGetTokenMock(createMockToken({ sub: "999" }));
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await getServerSession({ req: createMockRequest() });
      expect(result).toBeNull();
    });

    it("returns session with correct user data", async () => {
      const mockUser = createMockUser();
      setupGetTokenMock(createMockToken());
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
        },
      });
    });
  });

  describe("User Resolution", () => {
    it("resolves user by token subject ID", async () => {
      const token = createMockToken({
        sub: "999",
        email: "user@example.com",
      });

      setupGetTokenMock(token);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await getServerSession({ req: createMockRequest() });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 999 },
          select: expect.any(Object),
        })
      );
    });

    it("returns user data from database lookup", async () => {
      const dbUser = createMockUser({ id: 999, email: "db-user@example.com" });
      const token = createMockToken({
        sub: "999",
        email: "token-email@example.com",
      });

      setupGetTokenMock(token);
      prismaMock.user.findUnique.mockResolvedValue(dbUser);

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toMatchObject({
        user: {
          id: 999,
          email: "db-user@example.com",
        },
      });
    });

    it("uses ID field for database queries", async () => {
      const mockUser = createMockUser();
      setupGetTokenMock(createMockToken());
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await getServerSession({ req: createMockRequest() });

      const calls = prismaMock.user.findUnique.mock.calls;
      for (const call of calls) {
        const whereClause = call[0]?.where as Record<string, unknown>;
        expect(whereClause).toHaveProperty("id");
        expect(whereClause).not.toHaveProperty("email");
      }
    });
  });

  describe("Cache Behavior", () => {
    it("returns cached session on second call with same identity fields", async () => {
      const mockUser = createMockUser();
      setupGetTokenMock(createMockToken());
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const first = await getServerSession({ req: createMockRequest() });
      const second = await getServerSession({ req: createMockRequest() });

      expect(first).toEqual(second);
      // user.findUnique should only be called once (cached on second call)
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it("cache hit even when token exp/iat change (stable cache key)", async () => {
      const mockUser = createMockUser();
      const baseToken = createMockToken();
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      setupGetTokenMock({ ...baseToken, exp: 1000 });
      const first = await getServerSession({ req: createMockRequest() });

      setupGetTokenMock({ ...baseToken, exp: 2000 });
      const second = await getServerSession({ req: createMockRequest() });

      expect(first).toEqual(second);
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it("cache miss when identity fields change", async () => {
      const mockUser = createMockUser();
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      setupGetTokenMock(createMockToken({ upId: "usr-5" }));
      await getServerSession({ req: createMockRequest() });

      setupGetTokenMock(createMockToken({ upId: "usr-different" }));
      await getServerSession({ req: createMockRequest() });

      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
    });

    it("cache miss when belongsToActiveTeam changes", async () => {
      const mockUser = createMockUser();
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      setupGetTokenMock(createMockToken({ belongsToActiveTeam: true }));
      await getServerSession({ req: createMockRequest() });

      setupGetTokenMock(createMockToken({ belongsToActiveTeam: false }));
      await getServerSession({ req: createMockRequest() });

      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
