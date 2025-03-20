import { vi, beforeEach } from "vitest";

import type * as constants from "@calcom/lib/constants";

const mockedConstants = {
  IS_PRODUCTION: false,
  IS_TEAM_BILLING_ENABLED: false,
  WEBSITE_URL: "",
  PUBLIC_INVALIDATE_AVAILABLE_SLOTS_ON_BOOKING_FORM: true,
  CLOUDFLARE_SITE_ID: "test-site-id",
  CLOUDFLARE_USE_TURNSTILE_IN_BOOKER: "1",
  DEFAULT_LIGHT_BRAND_COLOR: "#292929",
  DEFAULT_DARK_BRAND_COLOR: "#fafafa",
  CALCOM_VERSION: "0.0.0",
  IS_SELF_HOSTED: false,
  SEO_IMG_DEFAULT: "https://cal.com/og-image.png",
  SEO_IMG_OGIMG: "https://cal.com/og-image-wide.png",
  SEO_IMG_LOGO: "https://cal.com/logo.png",
  CURRENT_TIMEZONE: "Europe/London",
  APP_NAME: "Cal.com",
  BOOKER_NUMBER_OF_DAYS_TO_LOAD: 14,
  PUBLIC_QUICK_AVAILABILITY_ROLLOUT: 100,
} as typeof constants;

vi.mock("@calcom/lib/constants", () => {
  return mockedConstants;
});

beforeEach(() => {
  Object.entries(mockedConstants).forEach(([key]) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete mockedConstants[key];
  });
});

export const constantsScenarios = {
  enableTeamBilling: () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockedConstants.IS_TEAM_BILLING_ENABLED = true;
  },
  setWebsiteUrl: (url: string) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockedConstants.WEBSITE_URL = url;
  },
  set: (envVariables: Record<string, string>) => {
    Object.entries(envVariables).forEach(([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockedConstants[key] = value;
    });
  },
};
