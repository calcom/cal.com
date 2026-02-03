/**
 * @vitest-environment jsdom
 */
// @ts-nocheck - Test file with mock type compatibility issues that don't affect test functionality
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { useOnboardingStore, useOnboarding } from "./onboardingStore";

// Mock all dependencies
vi.mock("next-auth/react");
vi.mock("next/navigation");
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      organizations: {
        getOrganizationOnboarding: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

// Mock constants
vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual("@calcom/lib/constants");
  return {
    ...actual,
    IS_SELF_HOSTED: false, // Default to false, will be overridden in specific tests
  };
});

function renderUseOnboardingStore() {
  renderHook(() => useOnboarding(), { wrapper: createWrapper() });
  return renderHook(() => useOnboardingStore(), { wrapper: createWrapper() });
}

// Test Data Builders
const createTestSession = (overrides?: {
  email?: string;
  role?: UserPermissionRole;
  status?: "loading" | "authenticated" | "unauthenticated";
}) => {
  const status = overrides?.status || "authenticated";

  if (status === "loading") {
    return {
      data: null,
      status: "loading" as const,
      update: vi.fn(),
    };
  }

  if (status === "unauthenticated") {
    return {
      data: null,
      status: "unauthenticated" as const,
      update: vi.fn(),
    };
  }

  return {
    data: {
      user: {
        email: overrides?.email || "test@example.com",
        role: overrides?.role || UserPermissionRole.USER,
      },
    },
    status: "authenticated" as const,
    update: vi.fn(),
  };
};

const createTestOrganizationOnboarding = (overrides?: {
  isComplete?: boolean;
  id?: string;
  billingPeriod?: string;
  pricePerSeat?: number;
  seats?: number;
  orgOwnerEmail?: string;
  name?: string;
  slug?: string;
  bio?: string;
  logo?: string;
}) => ({
  id: overrides?.id || "test-onboarding-id",
  isComplete: overrides?.isComplete ?? false,
  billingPeriod: overrides?.billingPeriod || "MONTHLY",
  pricePerSeat: overrides?.pricePerSeat ?? 20,
  seats: overrides?.seats ?? 5,
  orgOwnerEmail: overrides?.orgOwnerEmail || "test@example.com",
  name: overrides?.name || "Test Organization",
  slug: overrides?.slug || "test-org",
  bio: overrides?.bio || "Test bio",
  logo: overrides?.logo || "test-logo.png",
});

function mockOrganizationOnboardingFromDB(data: ReturnType<typeof createTestOrganizationOnboarding> | null) {
  const organizationOnboarding = data ? createTestOrganizationOnboarding(data) : null;
  (trpc.viewer.organizations.getOrganizationOnboarding.useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
    data: organizationOnboarding,
    isPending: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

const createTestSearchParams = (params?: Record<string, string>) => {
  return new URLSearchParams(params);
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock implementations
const mockRouterPush = vi.fn().mockImplementation((...args: string[]) => {
  console.trace();
  console.log("mockRouterPush called", args[0]);
});
const mockUseSession = vi.mocked(useSession);
vi.mocked(useRouter).mockReturnValue({
  push: mockRouterPush,
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
});
const mockUsePathname = vi.mocked(usePathname);
const mockUseSearchParams = vi.mocked(useSearchParams);

// Test wrapper for React hooks - no wrapper needed for this test
const createWrapper = () => undefined;

describe("OnboardingStore", () => {
  beforeEach(() => {
    // Reset the store and let React do any side effects
    act(() => {
      useOnboardingStore.getState().reset();
    });
    // Reset localStorage mock
    localStorageMock.clear.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    mockRouterPush.mockClear();

    // Setup default mocks
    mockUsePathname.mockReturnValue("/settings/organizations/new");
    mockUseSearchParams.mockReturnValue(createTestSearchParams());

    (
      trpc.viewer.organizations.getOrganizationOnboarding.useQuery as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      data: undefined,
      isPending: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      useOnboardingStore.getState().reset();
    });
    vi.clearAllMocks();
    mockRouterPush.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe("Zustand Store Actions - Complex Logic", () => {
    describe("Reset Functionality", () => {
      it("should reset to initial state when called without parameters", () => {
        const { result } = renderHook(() => useOnboardingStore(), { wrapper: createWrapper() });

        // Set some values
        act(() => {
          result.current.setName("Test Org");
          result.current.setSlug("test-org");
          result.current.setBillingPeriod("ANNUALLY" as const);
          result.current.setSeats(15);
          result.current.addInvitedMember({ email: "test@example.com", name: "Test User" });
        });

        // Reset
        act(() => {
          result.current.reset();
        });

        expect(result.current.name).toBe("");
        expect(result.current.slug).toBe("");
        expect(result.current.billingPeriod).toBeUndefined();
        expect(result.current.seats).toBeNull();
        expect(result.current.invitedMembers).toEqual([]);
      });

      it("should set specific state when called with parameters", () => {
        const { result } = renderHook(() => useOnboardingStore(), { wrapper: createWrapper() });
        const newState = {
          name: "Partial Reset Org",
          slug: "partial-reset",
          seats: 25,
        };

        act(() => {
          result.current.reset(newState);
        });

        expect(result.current.name).toBe("Partial Reset Org");
        expect(result.current.slug).toBe("partial-reset");
        expect(result.current.seats).toBe(25);
      });

      it("should clear localStorage when resetting without parameters", () => {
        const { result } = renderHook(() => useOnboardingStore(), { wrapper: createWrapper() });

        // Set some values to trigger localStorage save
        act(() => {
          result.current.setName("Test Org");
        });

        // Reset
        act(() => {
          result.current.reset();
        });

        // Verify localStorage removeItem was called
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("org-creation-onboarding");
      });
    });
  });

  describe("useOnboarding Hook", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(createTestSession());
    });

    describe("Authentication Handling", () => {
      it("should redirect to login when session is unauthenticated", async () => {
        mockUseSession.mockReturnValue(createTestSession({ status: "unauthenticated" }));
        mockUsePathname.mockReturnValue("/settings/organizations/new");
        mockUseSearchParams.mockReturnValue(createTestSearchParams());

        renderHook(() => useOnboarding(), { wrapper: createWrapper() });

        await waitFor(() => {
          expect(mockRouterPush).toHaveBeenCalledWith(
            `/auth/login?callbackUrl=${WEBAPP_URL}/settings/organizations/new`
          );
        });
        mockRouterPush.mockClear();
        expect(mockRouterPush).not.toHaveBeenCalled();
      });

      it("should not redirect when session is authenticated", () => {
        expect(mockRouterPush).not.toHaveBeenCalled();
        mockUseSession.mockReturnValue(createTestSession({ status: "authenticated" }));

        renderHook(() => useOnboarding(), { wrapper: createWrapper() });

        expect(mockRouterPush).not.toHaveBeenCalled();
      });
    });

    describe("Organization Onboarding State Sync", () => {
      it("should return organization onboarding data when available", () => {
        const organizationOnboarding = createTestOrganizationOnboarding({
          name: "Test Org",
          slug: "test-org",
        });

        (
          trpc.viewer.organizations.getOrganizationOnboarding.useQuery as ReturnType<typeof vi.fn>
        ).mockReturnValue({
          data: organizationOnboarding,
          isPending: false,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        });

        const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

        expect(result.current.dbOnboarding).toEqual(organizationOnboarding);
        expect(result.current.isLoadingOrgOnboarding).toBe(false);
      });

      it("should set onboardingData from DB to zustand if not set already", async () => {
        const organizationOnboarding = createTestOrganizationOnboarding({
          id: "sync-test-id",
          name: "Synced Organization",
          slug: "synced-org",
          bio: "Synced bio content",
          logo: "synced-logo.png",
          billingPeriod: "ANNUALLY",
          pricePerSeat: 25,
          seats: 10,
          orgOwnerEmail: "owner@synced.com",
        });

        (
          trpc.viewer.organizations.getOrganizationOnboarding.useQuery as ReturnType<typeof vi.fn>
        ).mockReturnValue({
          data: organizationOnboarding,
          isPending: false,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        });

        renderHook(() => useOnboarding(), { wrapper: createWrapper() });
        const { result: storeResult } = renderHook(() => useOnboardingStore(), { wrapper: createWrapper() });

        await waitFor(() => {
          expect(storeResult.current.onboardingId).toBe("sync-test-id");
        });

        expect(storeResult.current.name).toBe("Synced Organization");
        expect(storeResult.current.slug).toBe("synced-org");
        expect(storeResult.current.bio).toBe("Synced bio content");
        expect(storeResult.current.logo).toBe("synced-logo.png");
        expect(storeResult.current.billingPeriod).toBe("ANNUALLY");
        expect(storeResult.current.pricePerSeat).toBe(25);
        expect(storeResult.current.seats).toBe(10);
        expect(storeResult.current.orgOwnerEmail).toBe("owner@synced.com");
      });

      it("should sync onboardingData from DB to zustand if set already", async () => {
        mockOrganizationOnboardingFromDB(
          createTestOrganizationOnboarding({
            id: "onboarding1",
            name: "Onboarding 1 Organization",
            slug: "onboarding1-org",
            bio: "Onboarding 1 bio content",
            logo: "onboarding1-logo.png",
            billingPeriod: "MONTHLY",
            pricePerSeat: 15,
            seats: 5,
            orgOwnerEmail: "owner@onboarding1.com",
          })
        );

        // Load the store to set the initial state
        const { result: storeResultBefore } = renderUseOnboardingStore();

        expect(storeResultBefore.current.name).toBe("Onboarding 1 Organization");
        expect(storeResultBefore.current.slug).toBe("onboarding1-org");

        mockOrganizationOnboardingFromDB(
          createTestOrganizationOnboarding({
            id: "sync-test-id",
            name: "Synced Organization",
            slug: "synced-org",
            bio: "Synced bio content",
            logo: "synced-logo.png",
            billingPeriod: "ANNUALLY",
            pricePerSeat: 25,
            seats: 10,
            orgOwnerEmail: "owner@synced.com",
          })
        );

        // Load the store to sync the new data
        const { result: storeResultAfter } = renderUseOnboardingStore();
        // Verify the data is synced
        expect(storeResultAfter.current.name).toBe("Synced Organization");
        expect(storeResultAfter.current.slug).toBe("synced-org");
      });
    });
  });
});
