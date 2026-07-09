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
vi.mock("@calcom/features/users/repositories/UserRepository", createUserRepositoryMock);
vi.mock("@calcom/lib/getAvatarUrl", createAvatarUrlMock);
vi.mock("@calcom/lib/safeStringify", createSafeStringifyMock);
vi.mock("next-auth/jwt", createGetTokenMock);

import { getToken } from "next-auth/jwt";
import { getServerSession } from "./getServerSession";

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

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
      });
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

      // The first DB touch is now the password-change revocation lookup, which
      // selects passwordChangedAt. When that user is missing we return early, so
      // assert the id was resolved from token.sub without over-specifying the projection.
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 999 } })
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

  describe("Session revocation on password change", () => {
    const iat = 1_700_000_000;

    it("returns null when the token was issued before the password change", async () => {
      setupGetTokenMock({ ...createMockToken({ sub: "5" }), iat });
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ id: 5, passwordChangedAt: new Date((iat + 60) * 1000) })
      );

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toBeNull();
    });

    it("returns null when the token was issued in the same second as the change", async () => {
      setupGetTokenMock({ ...createMockToken({ sub: "5" }), iat });
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ id: 5, passwordChangedAt: new Date(iat * 1000) })
      );

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toBeNull();
    });

    it("returns a session when the token was issued after the password change", async () => {
      setupGetTokenMock({ ...createMockToken({ sub: "5" }), iat });
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ id: 5, passwordChangedAt: new Date((iat - 60) * 1000) })
      );

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(5);
    });

    it("returns a session when the user never changed their password", async () => {
      setupGetTokenMock({ ...createMockToken({ sub: "5" }), iat });
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ id: 5, passwordChangedAt: null })
      );

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(5);
    });

    it("returns null when the token carries the SessionInvalidated flag even if iat is newer than passwordChangedAt", async () => {
      // NextAuth rotates iat forward on session refresh, so a revoked-but-refreshed
      // token can have iat > passwordChangedAt. The sticky error flag must still revoke it.
      setupGetTokenMock({
        ...createMockToken({ sub: "5" }),
        iat: iat + 100_000,
        error: "SessionInvalidated",
      });
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ id: 5, passwordChangedAt: new Date(iat * 1000) })
      );

      const result = await getServerSession({ req: createMockRequest() });

      expect(result).toBeNull();
    });
  });
});
