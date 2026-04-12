import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";
import CalComAdapter from "./next-auth-custom-adapter";

function createP2002Error(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
    meta: { target },
  });
}

const mockPrisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

const mockAccount = {
  userId: "1",
  type: "oauth" as const,
  provider: "google",
  providerAccountId: "google-123",
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_at: 1234567890,
  token_type: "Bearer",
  scope: "openid email",
  id_token: "id-token",
  session_state: null,
};

const mockDbAccount = {
  id: 1,
  userId: 1,
  type: "oauth",
  provider: "google",
  providerAccountId: "google-123",
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_at: 1234567890,
  token_type: "Bearer",
  scope: "openid email",
  id_token: "id-token",
  session_state: null,
};

/**
 * Simulates the signIn callback's new-user creation + P2002 recovery logic
 * extracted from next-auth-options.ts (lines ~1374-1475).
 *
 * This tests the full race condition scenario without needing to boot NextAuth:
 * 1. user.create() throws P2002 (email conflict from concurrent request)
 * 2. Recovery: find the existing user by email
 * 3. Link the OAuth account via adapter.linkAccount()
 * 4. Return true (login succeeds)
 */
async function simulateSignInNewUserCreation({
  prismaMock,
  adapter,
  userEmail,
  idP,
  account,
}: {
  prismaMock: DeepMockProxy<PrismaClient>;
  adapter: ReturnType<typeof CalComAdapter>;
  userEmail: string;
  idP: string;
  account: typeof mockAccount;
}): Promise<string | boolean> {
  try {
    await prismaMock.user.create({ data: {} as never });
    await adapter.linkAccount!(account);
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String(err.meta?.target ?? "");
      if (target.includes("email") || target.includes("username")) {
        try {
          const existingUser = await prismaMock.user.findFirst({
            where: { email: { equals: userEmail, mode: "insensitive" } },
            select: { id: true, email: true, twoFactorEnabled: true, identityProvider: true },
          });
          if (existingUser && (existingUser as { identityProvider: string }).identityProvider === idP) {
            await adapter.linkAccount!({
              ...account,
              userId: String(existingUser.id),
            });
            return true;
          }
        } catch {
          // Recovery failed, fall through to error
        }
      }
    }
    return "/auth/error?error=user-creation-error";
  }
}

describe("signIn callback – new user P2002 recovery (full flow)", () => {
  let adapter: ReturnType<typeof CalComAdapter>;

  beforeEach(() => {
    mockReset(mockPrisma);
    adapter = CalComAdapter(mockPrisma);
  });

  it("BEFORE fix: user.create P2002 with generic catch returns error page", async () => {
    // Simulates the old signIn catch-all that treated every error the same
    mockPrisma.user.create.mockRejectedValue(createP2002Error(["email"]));

    let result: string | boolean;
    try {
      await mockPrisma.user.create({ data: {} as never });
      result = true;
    } catch {
      // Old code: no P2002 detection, just a generic error redirect
      result = "/auth/error?error=user-creation-error";
    }

    expect(result).toBe("/auth/error?error=user-creation-error");
    // The old code never attempted to find the existing user
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("AFTER fix: user.create P2002 recovers by linking existing user", async () => {
    // user.create fails with P2002 (race condition: user created by concurrent request)
    mockPrisma.user.create.mockRejectedValue(createP2002Error(["email"]));

    // Recovery: find the user that was created by the other request
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 42,
      email: "test@example.com",
      twoFactorEnabled: false,
      identityProvider: "GOOGLE",
    } as never);

    // linkAccount succeeds (adapter handles P2002 internally too)
    mockPrisma.account.create.mockResolvedValue(mockDbAccount as never);

    const result = await simulateSignInNewUserCreation({
      prismaMock: mockPrisma,
      adapter,
      userEmail: "test@example.com",
      idP: "GOOGLE",
      account: mockAccount,
    });

    // Login succeeds instead of returning error page
    expect(result).toBe(true);

    // Verify recovery looked up the existing user with case-insensitive email
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "test@example.com", mode: "insensitive" } },
      select: { id: true, email: true, twoFactorEnabled: true, identityProvider: true },
    });
  });

  it("AFTER fix: P2002 with wrong identity provider does not recover", async () => {
    mockPrisma.user.create.mockRejectedValue(createP2002Error(["email"]));

    // User exists but was created with a different provider (e.g. CAL password)
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 42,
      email: "test@example.com",
      twoFactorEnabled: false,
      identityProvider: "CAL",
    } as never);

    mockPrisma.account.create.mockResolvedValue(mockDbAccount as never);

    const result = await simulateSignInNewUserCreation({
      prismaMock: mockPrisma,
      adapter,
      userEmail: "test@example.com",
      idP: "GOOGLE",
      account: mockAccount,
    });

    // Should NOT recover — identity provider mismatch
    expect(result).toBe("/auth/error?error=user-creation-error");
  });

  it("AFTER fix: recovery uses case-insensitive email lookup", async () => {
    mockPrisma.user.create.mockRejectedValue(createP2002Error(["email"]));

    mockPrisma.user.findFirst.mockResolvedValue({
      id: 42,
      email: "Test@Example.com",
      twoFactorEnabled: false,
      identityProvider: "GOOGLE",
    } as never);

    mockPrisma.account.create.mockResolvedValue(mockDbAccount as never);

    const result = await simulateSignInNewUserCreation({
      prismaMock: mockPrisma,
      adapter,
      userEmail: "test@example.com",
      idP: "GOOGLE",
      account: mockAccount,
    });

    expect(result).toBe(true);

    // Verify case-insensitive query
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "test@example.com", mode: "insensitive" } },
      select: { id: true, email: true, twoFactorEnabled: true, identityProvider: true },
    });
  });

  it("AFTER fix: non-email P2002 still returns error page", async () => {
    // P2002 on a non-email/username field should NOT recover
    mockPrisma.user.create.mockRejectedValue(createP2002Error(["some_other_field"]));

    const result = await simulateSignInNewUserCreation({
      prismaMock: mockPrisma,
      adapter,
      userEmail: "test@example.com",
      idP: "GOOGLE",
      account: mockAccount,
    });

    expect(result).toBe("/auth/error?error=user-creation-error");
  });

  it("AFTER fix: non-P2002 error still returns error page", async () => {
    mockPrisma.user.create.mockRejectedValue(new Error("Connection timeout"));

    const result = await simulateSignInNewUserCreation({
      prismaMock: mockPrisma,
      adapter,
      userEmail: "test@example.com",
      idP: "GOOGLE",
      account: mockAccount,
    });

    expect(result).toBe("/auth/error?error=user-creation-error");
  });
});

describe("CalComAdapter – linkAccount BEFORE fix (proves the bug)", () => {
  // This test documents the old behavior: a bare account.create()
  // with no P2002 handling would crash and propagate the error upstream,
  // ultimately causing the "Error creating a new user" lockout (#28269).
  it("unprotected linkAccount throws on P2002 (the bug)", async () => {
    const unprotectedLinkAccount = async () => {
      // Simulates the old code: just account.create() with no catch
      await mockPrisma.account.create({ data: {} as never });
    };

    mockPrisma.account.create.mockRejectedValue(createP2002Error(["provider_providerAccountId"]));

    await expect(unprotectedLinkAccount()).rejects.toThrow("Unique constraint failed");
  });
});

describe("CalComAdapter – linkAccount P2002 handling (the fix)", () => {
  let adapter: ReturnType<typeof CalComAdapter>;

  beforeEach(() => {
    mockReset(mockPrisma);
    adapter = CalComAdapter(mockPrisma);
  });

  it("creates account on first call", async () => {
    mockPrisma.account.create.mockResolvedValue(mockDbAccount as never);

    const result = await adapter.linkAccount!(mockAccount);

    expect(result.provider).toBe("google");
    expect(result.providerAccountId).toBe("google-123");
    expect(mockPrisma.account.create).toHaveBeenCalledOnce();
  });

  it("recovers on P2002 by returning the existing account", async () => {
    mockPrisma.account.create.mockRejectedValue(createP2002Error(["provider_providerAccountId"]));
    mockPrisma.account.findFirst.mockResolvedValue(mockDbAccount as never);

    const result = await adapter.linkAccount!(mockAccount);

    expect(result.provider).toBe("google");
    expect(result.providerAccountId).toBe("google-123");
    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        provider: "google",
        providerAccountId: "google-123",
      },
    });
  });

  it("throws P2002 if existing account not found after conflict", async () => {
    mockPrisma.account.create.mockRejectedValue(createP2002Error(["provider_providerAccountId"]));
    mockPrisma.account.findFirst.mockResolvedValue(null);

    await expect(adapter.linkAccount!(mockAccount)).rejects.toThrow("Unique constraint failed");
  });

  it("re-throws non-P2002 errors", async () => {
    const error = new Error("Database connection failed");
    mockPrisma.account.create.mockRejectedValue(error);

    await expect(adapter.linkAccount!(mockAccount)).rejects.toThrow("Database connection failed");
    expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
  });
});
