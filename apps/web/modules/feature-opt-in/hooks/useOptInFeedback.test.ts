import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOptInFeedback } from "./useOptInFeedback";

const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

const mockEnv = vi.hoisted(() => ({ isENVDev: false }));
vi.mock("@calcom/lib/env", () => ({
  get isENVDev() {
    return mockEnv.isENVDev;
  },
}));

vi.mock("../lib/feature-opt-in-storage", () => ({
  getFeatureOptInTimestamp: vi.fn(() => Date.now() - 10 * 24 * 60 * 60 * 1000),
  isFeatureFeedbackShown: vi.fn(() => false),
  setFeatureFeedbackShown: vi.fn(),
}));

const featureConfig: OptInFeatureConfig = {
  slug: "bookings-v3" as OptInFeatureConfig["slug"],
  i18n: { title: "t", name: "n", description: "d" },
  bannerImage: { src: "/img.png", width: 100, height: 100 },
  policy: "permissive",
  formbricks: {
    waitAfterDays: 0,
    surveyId: "survey-1",
    questions: { ratingQuestionId: "q1", commentQuestionId: "q2" },
  },
};

describe("useOptInFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseSession.mockReturnValue({ data: { user: {} } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows feedback dialog for normal users after delay", () => {
    const { result } = renderHook(() => useOptInFeedback("bookings-v3", featureConfig));
    expect(result.current.showFeedbackDialog).toBe(false);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.showFeedbackDialog).toBe(true);
  });

  it("does not show feedback dialog when user is impersonated in production", () => {
    mockEnv.isENVDev = false;
    mockUseSession.mockReturnValue({
      data: { user: { impersonatedBy: { id: 999, email: "admin@cal.com" } } },
    });

    const { result } = renderHook(() => useOptInFeedback("bookings-v3", featureConfig));

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.showFeedbackDialog).toBe(false);
  });

  it("shows feedback dialog when user is impersonated in development", () => {
    mockEnv.isENVDev = true;
    mockUseSession.mockReturnValue({
      data: { user: { impersonatedBy: { id: 999, email: "admin@cal.com" } } },
    });

    const { result } = renderHook(() => useOptInFeedback("bookings-v3", featureConfig));

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.showFeedbackDialog).toBe(true);
  });

  it("shows feedback dialog when session has no impersonation", () => {
    mockUseSession.mockReturnValue({ data: { user: { name: "Test" } } });

    const { result } = renderHook(() => useOptInFeedback("bookings-v3", featureConfig));

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.showFeedbackDialog).toBe(true);
  });
});
