import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { describe, it, vi, expect, beforeEach, type MockedFunction } from "vitest";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MembershipRole } from "@calcom/prisma/enums";

import { validateUserHasOrgAdmin, type ValidatedOrgAdminSession } from "./validateUserHasOrgAdmin";

// Mock the dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
  headers: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@calcom/features/auth/lib/checkAdminOrOwner", () => ({
  checkAdminOrOwner: vi.fn(),
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn(() => ({})),
}));

const mockedGetServerSession = getServerSession as MockedFunction<typeof getServerSession>;
const mockedCheckAdminOrOwner = vi.mocked(checkAdminOrOwner);
const mockedRedirect = vi.mocked(redirect);

describe("validateUserHasOrgAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    expires: "2025-01-01",
    hasValidLicense: true,
    user: {
      id: 123,
      uuid: "test-uuid-123",
      email: "test@example.com",
      name: "Test User",
      org: {
        id: 456,
        name: "Test Org",
        slug: "test-org",
        logoUrl: null,
        fullDomain: "test-org.cal.com",
        domainSuffix: "cal.com",
        role: MembershipRole.ADMIN,
      },
      profile: {
        id: 789,
        upId: "usr-123",
        username: "testuser",
        organizationId: 456,
        organization: {
          id: 456,
          name: "Test Org",
          slug: "test-org",
          calVideoLogo: null,
          bannerUrl: null,
          requestedSlug: null,
        },
      },
    },
    profileId: 789,
    upId: "usr-123",
    ...overrides,
  });

  describe("when user has valid organization and admin role", () => {
    it("should return session when user is admin via user.org.role", async () => {
      const mockSession = createMockSession();
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(true);

      const result = await validateUserHasOrgAdmin();

      expect(result).toEqual(mockSession);
      expect(mockedRedirect).not.toHaveBeenCalled();
      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(MembershipRole.ADMIN);
      expect(result.user.id).toBe(123);
      expect(result.user.org?.id).toBe(456);
      expect(result.user.profile?.organizationId).toBe(456);
    });

    it("should return session when user is owner", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: {
            id: 456,
            name: "Test Org",
            slug: "test-org",
            logoUrl: null,
            fullDomain: "test-org.cal.com",
            domainSuffix: "cal.com",
            role: MembershipRole.OWNER,
          },
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: 456,
            organization: {
              id: 456,
              name: "Test Org",
              slug: "test-org",
              calVideoLogo: null,
              bannerUrl: null,
              requestedSlug: null,
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(true);

      const result = await validateUserHasOrgAdmin();

      expect(result).toEqual(mockSession);
      expect(mockedRedirect).not.toHaveBeenCalled();
      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(MembershipRole.OWNER);
    });

    it("should return session when role comes from organization members", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: undefined,
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: 456,
            organization: {
              id: 456,
              name: "Test Org",
              slug: "test-org",
              calVideoLogo: null,
              bannerUrl: null,
              requestedSlug: null,
              members: [
                { userId: 123, role: MembershipRole.ADMIN },
                { userId: 124, role: MembershipRole.MEMBER },
              ],
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(true);

      const result = await validateUserHasOrgAdmin();

      expect(result).toEqual(mockSession);
      expect(mockedRedirect).not.toHaveBeenCalled();
      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(MembershipRole.ADMIN);
    });
  });

  describe("when user does not have valid organization", () => {
    it("should redirect when session is null", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      await expect(validateUserHasOrgAdmin()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockedRedirect).toHaveBeenCalledWith("/settings/my-account/profile");
    });

    it("should redirect when user has no organization data", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: undefined,
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: null,
            organization: null,
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);

      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      await expect(validateUserHasOrgAdmin()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockedRedirect).toHaveBeenCalledWith("/settings/my-account/profile");
    });
  });

  describe("when user has organization but is not admin", () => {
    it("should redirect when user is only a member", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: {
            id: 456,
            name: "Test Org",
            slug: "test-org",
            logoUrl: null,
            fullDomain: "test-org.cal.com",
            domainSuffix: "cal.com",
            role: MembershipRole.MEMBER,
          },
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: 456,
            organization: {
              id: 456,
              name: "Test Org",
              slug: "test-org",
              calVideoLogo: null,
              bannerUrl: null,
              requestedSlug: null,
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(false);

      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      await expect(validateUserHasOrgAdmin()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockedRedirect).toHaveBeenCalledWith("/settings/organizations/profile");
      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(MembershipRole.MEMBER);
    });

    it("should redirect when role is undefined", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: undefined,
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: 456,
            organization: {
              id: 456,
              name: "Test Org",
              slug: "test-org",
              calVideoLogo: null,
              bannerUrl: null,
              requestedSlug: null,
              members: [
                { userId: 999, role: MembershipRole.ADMIN }, // Different user
              ],
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(false);

      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      await expect(validateUserHasOrgAdmin()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockedRedirect).toHaveBeenCalledWith("/settings/organizations/profile");
      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(undefined);
    });
  });

  describe("return type validation", () => {
    it("should return ValidatedOrgAdminSession type with non-nullable properties", async () => {
      const mockSession = createMockSession();
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(true);

      const result: ValidatedOrgAdminSession = await validateUserHasOrgAdmin();

      // Type assertions to ensure proper typing
      expect(typeof result.user.id).toBe("number");
      expect(result.user.org).toBeTruthy();
      expect(result.user.profile).toBeTruthy();
      expect(typeof result.user.profile.organizationId).toBe("number");
      expect(result.user.org.role).toBeTruthy();

      // Runtime checks that the types guarantee these properties exist
      expect(result.user.id).toBe(123);
      expect(result.user.org.id).toBe(456);
      expect(result.user.org.role).toBe(MembershipRole.ADMIN);
      expect(result.user.profile.organizationId).toBe(456);
    });
  });

  describe("role resolution logic", () => {
    it("should prefer org role over organization members role", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: {
            id: 456,
            name: "Test Org",
            slug: "test-org",
            logoUrl: null,
            fullDomain: "test-org.cal.com",
            domainSuffix: "cal.com",
            role: MembershipRole.OWNER, // This should be preferred
          },
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: 456,
            organization: {
              id: 456,
              name: "Test Org",
              slug: "test-org",
              calVideoLogo: null,
              bannerUrl: null,
              requestedSlug: null,
              members: [
                { userId: 123, role: MembershipRole.MEMBER }, // Different role
              ],
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(true);

      await validateUserHasOrgAdmin();

      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(MembershipRole.OWNER);
    });

    it("should fall back to organization members role when org role is not available", async () => {
      const mockSession = createMockSession({
        user: {
          id: 123,
          uuid: "test-uuid-123",
          email: "test@example.com",
          name: "Test User",
          org: undefined,
          profile: {
            id: 789,
            upId: "usr-123",
            username: "testuser",
            organizationId: 456,
            organization: {
              id: 456,
              name: "Test Org",
              slug: "test-org",
              calVideoLogo: null,
              bannerUrl: null,
              requestedSlug: null,
              members: [{ userId: 123, role: MembershipRole.ADMIN }],
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);
      mockedCheckAdminOrOwner.mockReturnValue(true);

      await validateUserHasOrgAdmin();

      expect(mockedCheckAdminOrOwner).toHaveBeenCalledWith(MembershipRole.ADMIN);
    });
  });

  describe("error handling", () => {
    it("should propagate errors from getServerSession", async () => {
      const error = new Error("Session error");
      mockedGetServerSession.mockRejectedValue(error);

      await expect(validateUserHasOrgAdmin()).rejects.toThrow("Session error");
    });

    it("should propagate errors from checkAdminOrOwner", async () => {
      const mockSession = createMockSession();
      mockedGetServerSession.mockResolvedValue(mockSession);

      const error = new Error("Permission check error");
      mockedCheckAdminOrOwner.mockImplementation(() => {
        throw error;
      });

      await expect(validateUserHasOrgAdmin()).rejects.toThrow("Permission check error");
    });
  });
});
