import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { describe, it, vi, expect, beforeEach, type MockedFunction } from "vitest";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MembershipRole } from "@calcom/prisma/enums";

import { validateUserHasOrg, type ValidatedOrgSession } from "./validateUserHasOrg";

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

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn(() => ({})),
}));

const mockedGetServerSession = getServerSession as MockedFunction<typeof getServerSession>;
const mockedRedirect = vi.mocked(redirect);

describe("validateUserHasOrg", () => {
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

  describe("when user has valid organization", () => {
    it("should return session when user has org in user.org", async () => {
      const mockSession = createMockSession();
      mockedGetServerSession.mockResolvedValue(mockSession);

      const result = await validateUserHasOrg();

      expect(result).toEqual(mockSession);
      expect(mockedRedirect).not.toHaveBeenCalled();
      expect(result.user.id).toBe(123);
      expect(result.user.org?.id).toBe(456);
      expect(result.user.profile?.organizationId).toBe(456);
    });

    it("should return session when user has organizationId but no org", async () => {
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
            },
          },
        },
      });
      mockedGetServerSession.mockResolvedValue(mockSession);

      const result = await validateUserHasOrg();

      expect(result).toEqual(mockSession);
      expect(mockedRedirect).not.toHaveBeenCalled();
    });
  });

  describe("when user does not have valid organization", () => {
    it("should redirect when session is null", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      await expect(validateUserHasOrg()).rejects.toThrow("NEXT_REDIRECT");
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

      await expect(validateUserHasOrg()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockedRedirect).toHaveBeenCalledWith("/settings/my-account/profile");
    });

    it("should redirect when user has no user id", async () => {
      const mockSession = createMockSession({
        user: {
          id: undefined as unknown as number,
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
      });
      mockedGetServerSession.mockResolvedValue(mockSession);

      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      await expect(validateUserHasOrg()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockedRedirect).toHaveBeenCalledWith("/settings/my-account/profile");
    });
  });

  describe("return type validation", () => {
    it("should return ValidatedOrgSession type with non-nullable properties", async () => {
      const mockSession = createMockSession();
      mockedGetServerSession.mockResolvedValue(mockSession);

      const result: ValidatedOrgSession = await validateUserHasOrg();

      // Type assertions to ensure proper typing
      expect(typeof result.user.id).toBe("number");
      expect(result.user.org).toBeTruthy();
      expect(result.user.profile).toBeTruthy();
      expect(typeof result.user.profile.organizationId).toBe("number");

      // Runtime checks that the types guarantee these properties exist
      expect(result.user.id).toBe(123);
      expect(result.user.org.id).toBe(456);
      expect(result.user.profile.organizationId).toBe(456);
    });
  });

  describe("error handling", () => {
    it("should propagate errors from getServerSession", async () => {
      const error = new Error("Session error");
      mockedGetServerSession.mockRejectedValue(error);

      await expect(validateUserHasOrg()).rejects.toThrow("Session error");
    });
  });
});
