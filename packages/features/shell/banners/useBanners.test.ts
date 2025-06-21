import { renderHook } from "@testing-library/react";

import { useBannersHeight } from "./useBanners";

// Mock the constants
jest.mock("@calcom/lib/constants", () => ({
  TOP_BANNER_HEIGHT: 40,
}));

describe("useBannersHeight", () => {
  test("Should return 0 when banners is null", () => {
    const { result } = renderHook(() => useBannersHeight(null));
    expect(result.current).toBe(0);
  });

  test("Should calculate height for single banners", () => {
    const banners = {
      teamUpgradeBanner: [],
      orgUpgradeBanner: [],
      verifyEmailBanner: true,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: false,
      invalidAppCredentialBanners: [],
    };

    const { result } = renderHook(() => useBannersHeight(banners));
    expect(result.current).toBe(40); // One banner * 40px
  });

  test("Should calculate height for multiple invalid app credential banners", () => {
    const banners = {
      teamUpgradeBanner: [],
      orgUpgradeBanner: [],
      verifyEmailBanner: false,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: false,
      invalidAppCredentialBanners: [
        { name: "Google Calendar", slug: "googlecalendar" },
        { name: "Zoom", slug: "zoom" },
        { name: "Slack", slug: "slack" },
      ],
    };

    const { result } = renderHook(() => useBannersHeight(banners));
    expect(result.current).toBe(120); // Three banners * 40px each
  });

  test("Should calculate height for mixed banner types", () => {
    const banners = {
      teamUpgradeBanner: [],
      orgUpgradeBanner: [],
      verifyEmailBanner: true,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: true,
      invalidAppCredentialBanners: [
        { name: "Google Calendar", slug: "googlecalendar" },
        { name: "Zoom", slug: "zoom" },
      ],
    };

    const { result } = renderHook(() => useBannersHeight(banners));
    expect(result.current).toBe(120); // 2 single banners + 2 invalid app banners = 4 * 40px
  });

  test("Should ignore empty arrays and null values", () => {
    const banners = {
      teamUpgradeBanner: [],
      orgUpgradeBanner: [],
      verifyEmailBanner: false,
      adminPasswordBanner: null,
      impersonationBanner: null,
      calendarCredentialBanner: false,
      invalidAppCredentialBanners: [],
    };

    const { result } = renderHook(() => useBannersHeight(banners));
    expect(result.current).toBe(0); // No active banners
  });
}); 