import { describe, it, expect } from "vitest";

import type { App } from "@calcom/types/App";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import {
  sanitizeAppForViewer,
  default as getApps,
  getAppFromSlug,
  getAppFromLocationValue,
  doesAppSupportTeamInstall,
  getLocalAppMetadata,
  hasIntegrationInstalled,
  getAppName,
  getAppType,
  isConferencing,
} from "./utils";
import type { CredentialDataWithTeamName, LocationOption } from "./utils";

describe("sanitizeAppForViewer", () => {
  it("should remove key, credential, and credentials properties", () => {
    const mockCredential: CredentialDataWithTeamName = {
      id: 1,
      type: "daily_video",
      key: { api_key: "secret-api-key" },
      userId: 1,
      user: { email: "test@example.com" },
      teamId: null,
      appId: "daily-video",
      invalid: false,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
      team: null,
      encryptedKey: null,
    };

    const mockApp: App & {
      credential: CredentialDataWithTeamName | null;
      credentials: CredentialDataWithTeamName[];
      locationOption: LocationOption | null;
    } = {
      type: "daily_video",
      name: "Daily Video",
      description: "Video conferencing",
      variant: "conferencing",
      slug: "daily-video",
      categories: ["conferencing"],
      logo: "/logo.png",
      publisher: "Daily",
      url: "https://daily.co",
      email: "support@daily.co",
      key: { api_key: "secret-global-api-key" },
      credential: mockCredential,
      credentials: [mockCredential],
      locationOption: {
        value: "integrations:daily_video",
        label: "Daily Video",
      },
    };

    const sanitized = sanitizeAppForViewer(mockApp);

    // Should not have key, credential, or credentials
    expect(sanitized).not.toHaveProperty("key");
    expect(sanitized).not.toHaveProperty("credential");
    expect(sanitized).not.toHaveProperty("credentials");

    // Should have all other properties
    expect(sanitized).toHaveProperty("type", "daily_video");
    expect(sanitized).toHaveProperty("name", "Daily Video");
    expect(sanitized).toHaveProperty("slug", "daily-video");
    expect(sanitized).toHaveProperty("locationOption");
    expect(sanitized.locationOption).toEqual({
      value: "integrations:daily_video",
      label: "Daily Video",
    });
  });

  it("should handle apps without credential or credentials", () => {
    const mockApp: App & {
      credential?: CredentialDataWithTeamName | null;
      credentials?: CredentialDataWithTeamName[];
      locationOption?: LocationOption | null;
    } = {
      type: "zoom_video",
      name: "Zoom",
      description: "Video conferencing",
      variant: "conferencing",
      slug: "zoom",
      categories: ["conferencing"],
      logo: "/logo.png",
      publisher: "Zoom",
      url: "https://zoom.us",
      email: "support@zoom.us",
      key: { api_key: "secret-key" },
    };

    const sanitized = sanitizeAppForViewer(mockApp);

    expect(sanitized).not.toHaveProperty("key");
    expect(sanitized).not.toHaveProperty("credential");
    expect(sanitized).not.toHaveProperty("credentials");
    expect(sanitized).toHaveProperty("slug", "zoom");
  });

  it("should preserve all non-sensitive properties", () => {
    const mockApp: App & {
      credential: CredentialDataWithTeamName | null;
      credentials: CredentialDataWithTeamName[];
      locationOption: LocationOption | null;
    } = {
      type: "stripe_payment",
      name: "Stripe",
      description: "Payment processing",
      variant: "payment",
      slug: "stripe",
      categories: ["payment"],
      logo: "/logo.png",
      publisher: "Stripe",
      url: "https://stripe.com",
      email: "support@stripe.com",
      verified: true,
      trending: true,
      rating: 4.5,
      reviews: 1000,
      isGlobal: false,
      key: { api_key: "sk_live_secret" },
      credential: null,
      credentials: [],
      locationOption: null,
      appData: {
        location: {
          type: "integrations:stripe",
          label: "Stripe",
          linkType: "dynamic",
        },
      },
    };

    const sanitized = sanitizeAppForViewer(mockApp);

    expect(sanitized).not.toHaveProperty("key");
    expect(sanitized).not.toHaveProperty("credential");
    expect(sanitized).not.toHaveProperty("credentials");
    expect(sanitized.verified).toBe(true);
    expect(sanitized.trending).toBe(true);
    expect(sanitized.rating).toBe(4.5);
    expect(sanitized.reviews).toBe(1000);
    expect(sanitized.appData).toBeDefined();
  });
});

const makeCredential = (overrides: Partial<CredentialDataWithTeamName> = {}): CredentialDataWithTeamName => ({
  id: 1,
  type: "daily_video",
  key: {},
  userId: 1,
  user: { email: "test@example.com" },
  teamId: null,
  appId: "daily-video",
  invalid: false,
  delegatedTo: null,
  delegatedToId: null,
  delegationCredentialId: null,
  team: null,
  encryptedKey: null,
  ...overrides,
});

describe("getApps", () => {
  it("should return all apps when no filterOnCredentials", () => {
    const apps = getApps([]);
    expect(apps.length).toBeGreaterThan(0);
  });

  it("should filter apps by credentials when filterOnCredentials is true", () => {
    const credential = makeCredential({ appId: "daily-video", type: "daily_video" });
    const apps = getApps([credential], true);
    const dailyApp = apps.find((a) => a.slug === "daily-video");
    expect(dailyApp).toBeDefined();
    expect(dailyApp!.credentials.length).toBeGreaterThanOrEqual(1);
  });

  it("should include global apps even when filterOnCredentials is true and no matching credentials", () => {
    const apps = getApps([], true);
    const globalApps = apps.filter((a) => a.isGlobal);
    for (const app of globalApps) {
      expect(app.credentials.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("should merge credential data into app", () => {
    const credential = makeCredential({ appId: "daily-video", type: "daily_video" });
    const apps = getApps([credential]);
    const dailyApp = apps.find((a) => a.slug === "daily-video");
    expect(dailyApp).toBeDefined();
    expect(dailyApp!.credential).toBeDefined();
    expect(dailyApp!.credentials.length).toBeGreaterThanOrEqual(1);
  });

  it("should set locationOption when app has location data and credentials", () => {
    const credential = makeCredential({ appId: "daily-video", type: "daily_video" });
    const apps = getApps([credential]);
    const dailyApp = apps.find((a) => a.slug === "daily-video");
    if (dailyApp?.appData?.location) {
      expect(dailyApp.locationOption).not.toBeNull();
      expect(dailyApp.locationOption!.value).toBe(dailyApp.appData.location.type);
    }
  });

  it("should handle empty credentials array", () => {
    const apps = getApps([]);
    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBeGreaterThan(0);
  });
});

describe("getAppFromSlug", () => {
  it("should return app metadata for a known slug", () => {
    const app = getAppFromSlug("daily-video");
    expect(app).toBeDefined();
    expect(app!.slug).toBe("daily-video");
  });

  it("should return undefined for an unknown slug", () => {
    expect(getAppFromSlug("nonexistent-app-slug-xyz")).toBeUndefined();
  });

  it("should return undefined for undefined slug", () => {
    expect(getAppFromSlug(undefined)).toBeUndefined();
  });
});

describe("getAppFromLocationValue", () => {
  it("should return app for a valid location type", () => {
    const app = getAppFromLocationValue("integrations:daily");
    expect(app).toBeDefined();
    expect(app!.slug).toBe("daily-video");
  });

  it("should return undefined for a non-matching location type", () => {
    expect(getAppFromLocationValue("nonexistent:location_type")).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(getAppFromLocationValue("")).toBeUndefined();
  });
});

describe("doesAppSupportTeamInstall", () => {
  it("should return false for paid apps", () => {
    expect(
      doesAppSupportTeamInstall({ appCategories: ["conferencing"], concurrentMeetings: undefined, isPaid: true })
    ).toBe(false);
  });

  it("should return false for calendar apps", () => {
    expect(
      doesAppSupportTeamInstall({ appCategories: ["calendar"], concurrentMeetings: undefined, isPaid: false })
    ).toBe(false);
  });

  it("should return false for conferencing apps without concurrent meetings", () => {
    expect(
      doesAppSupportTeamInstall({
        appCategories: ["conferencing"],
        concurrentMeetings: undefined,
        isPaid: false,
      })
    ).toBe(false);
  });

  it("should return true for conferencing apps with concurrent meetings", () => {
    expect(
      doesAppSupportTeamInstall({ appCategories: ["conferencing"], concurrentMeetings: true, isPaid: false })
    ).toBe(true);
  });

  it("should return true for non-calendar, non-video category apps", () => {
    expect(
      doesAppSupportTeamInstall({ appCategories: ["crm"], concurrentMeetings: undefined, isPaid: false })
    ).toBe(true);
  });
});

describe("getLocalAppMetadata", () => {
  it("should return all apps", () => {
    const apps = getLocalAppMetadata();
    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBeGreaterThan(0);
  });
});

describe("hasIntegrationInstalled", () => {
  it("should return true for an installed app type", () => {
    const apps = getLocalAppMetadata();
    const installedApp = apps.find((a) => a.installed);
    if (installedApp) {
      expect(hasIntegrationInstalled(installedApp.type)).toBe(true);
    }
  });

  it("should return false for a nonexistent app type", () => {
    expect(hasIntegrationInstalled("nonexistent_other" as Parameters<typeof hasIntegrationInstalled>[0])).toBe(false);
  });
});

describe("getAppName", () => {
  it("should return the name of a known app", () => {
    const apps = getLocalAppMetadata();
    if (apps.length > 0) {
      const firstApp = apps[0];
      const name = getAppName(firstApp.slug);
      if (name) {
        expect(typeof name).toBe("string");
      }
    }
  });

  it("should return null for an unknown app", () => {
    expect(getAppName("nonexistent-app-xyz")).toBeNull();
  });
});

describe("getAppType", () => {
  it("should return Calendar for calendar type apps", () => {
    const apps = getLocalAppMetadata();
    const calendarApp = apps.find((a) => a.type.endsWith("_calendar"));
    if (calendarApp) {
      expect(getAppType(calendarApp.dirName ?? calendarApp.slug)).toBe("Calendar");
    }
  });

  it("should return Payment for payment type apps", () => {
    const apps = getLocalAppMetadata();
    const paymentApp = apps.find((a) => a.type.endsWith("_payment"));
    if (paymentApp) {
      expect(getAppType(paymentApp.dirName ?? paymentApp.slug)).toBe("Payment");
    }
  });
});

describe("isConferencing", () => {
  it("should return true for conferencing category", () => {
    expect(isConferencing(["conferencing"])).toBe(true);
  });

  it("should return true for video category", () => {
    expect(isConferencing(["video"])).toBe(true);
  });

  it("should return false for non-conferencing categories", () => {
    expect(isConferencing(["calendar", "crm"])).toBe(false);
  });
});
