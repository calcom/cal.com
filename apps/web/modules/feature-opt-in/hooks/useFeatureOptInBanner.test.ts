import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFeatureOptInBanner } from "./useFeatureOptInBanner";

const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@calcom/features/feature-opt-in/config", () => ({
  getOptInFeatureConfig: vi.fn(() => ({
    slug: "bookings-v3",
    i18n: { title: "t", name: "n", description: "d" },
    bannerImage: { src: "/img.png", width: 100, height: 100 },
    policy: "permissive",
    displayLocations: ["banner", "settings"],
  })),
  shouldDisplayFeatureAt: vi.fn(() => true),
}));

vi.mock("../lib/feature-opt-in-storage", () => ({
  getFeatureOptInTimestamp: vi.fn(() => null),
  isFeatureDismissed: vi.fn(() => false),
  setFeatureDismissed: vi.fn(),
  setFeatureOptedIn: vi.fn(),
  isFeatureFeedbackShown: vi.fn(() => false),
  setFeatureFeedbackShown: vi.fn(),
}));

const mockMutateAsync = vi.fn();
const mockInvalidate = vi.fn();
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      viewer: {
        featureOptIn: {
          checkFeatureOptInEligibility: { invalidate: mockInvalidate },
          listForUser: { invalidate: mockInvalidate },
        },
      },
    })),
    viewer: {
      featureOptIn: {
        checkFeatureOptInEligibility: {
          useQuery: vi.fn(() => ({
            data: {
              status: "can_opt_in",
              canOptIn: true,
              blockingReason: null,
              userRoleContext: { isOrgAdmin: false, orgId: null, adminTeamIds: [], adminTeamNames: [] },
            },
            isLoading: false,
          })),
        },
        setUserState: { useMutation: vi.fn(() => ({ mutateAsync: mockMutateAsync })) },
        setTeamState: { useMutation: vi.fn(() => ({ mutateAsync: mockMutateAsync })) },
        setOrganizationState: { useMutation: vi.fn(() => ({ mutateAsync: mockMutateAsync })) },
        setUserAutoOptIn: { useMutation: vi.fn(() => ({ mutateAsync: mockMutateAsync })) },
        setTeamAutoOptIn: { useMutation: vi.fn(() => ({ mutateAsync: mockMutateAsync })) },
        setOrganizationAutoOptIn: { useMutation: vi.fn(() => ({ mutateAsync: mockMutateAsync })) },
      },
    },
  },
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

describe("useFeatureOptInBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows banner for normal users when eligible", () => {
    mockUseSession.mockReturnValue({ data: { user: {} } });

    const { result } = renderHook(() =>
      useFeatureOptInBanner("bookings-v3", { onOptInSuccess: vi.fn() })
    );

    expect(result.current.shouldShow).toBe(true);
  });

  it("still shows banner when user is impersonated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { impersonatedBy: { id: 999, email: "admin@cal.com" } } },
    });

    const { result } = renderHook(() =>
      useFeatureOptInBanner("bookings-v3", { onOptInSuccess: vi.fn() })
    );

    expect(result.current.shouldShow).toBe(true);
  });

  it("calls onOptInSuccess callback when markOptedIn is invoked", () => {
    mockUseSession.mockReturnValue({ data: { user: {} } });
    const onOptInSuccess = vi.fn();

    const { result } = renderHook(() =>
      useFeatureOptInBanner("bookings-v3", { onOptInSuccess })
    );

    result.current.markOptedIn();

    expect(onOptInSuccess).toHaveBeenCalledOnce();
  });
});
