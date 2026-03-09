import { describe, it, expect, vi, beforeEach } from "vitest";

import { TRPCError } from "@trpc/server";

import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { appByIdHandler } from "./appById.handler";
import type { TAppByIdInputSchema } from "./appById.schema";

// Mock the dependencies
vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
}));

vi.mock("@calcom/app-store/utils", () => ({
  default: vi.fn(),
  sanitizeAppForViewer: vi.fn((app) => {
    const { key: _, credential: _1, credentials: _2, ...sanitized } = app;
    return sanitized;
  }),
}));

import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import getApps, { sanitizeAppForViewer } from "@calcom/app-store/utils";

import type { CredentialDataWithTeamName, LocationOption } from "@calcom/app-store/utils";
import type { App } from "@calcom/types/App";

describe("appByIdHandler", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    username: "testuser",
    name: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not expose key field for globally installed apps", async () => {
    const secretApiKey = "secret-daily-api-key-12345";
    const mockCredential: CredentialDataWithTeamName = {
      id: 0,
      type: "daily_video",
      key: { apikey: secretApiKey },
      userId: 0,
      user: { email: "" },
      teamId: null,
      appId: "daily-video",
      invalid: false,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
      team: {
        name: "Default",
      },
    };

    const mockApp: App & {
      credential: CredentialDataWithTeamName | null;
      credentials: CredentialDataWithTeamName[];
      locationOption: LocationOption | null;
    } = {
      type: "daily_video",
      name: "Cal Video",
      description: "Video conferencing",
      variant: "conferencing",
      slug: "daily-video",
      categories: ["conferencing"],
      logo: "icon.svg",
      publisher: "Cal.com",
      url: "https://daily.co",
      email: "help@cal.com",
      isGlobal: true,
      // This is the sensitive key that should NOT be exposed
      key: { apikey: secretApiKey },
      credential: mockCredential,
      credentials: [mockCredential],
      locationOption: {
        value: "integrations:daily",
        label: "Cal Video",
      },
      appData: {
        location: {
          linkType: "dynamic",
          type: "integrations:daily",
          label: "Cal Video",
        },
      },
    };

    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
    vi.mocked(getApps).mockReturnValue([mockApp]);

    const result = await appByIdHandler({
      ctx: { user: mockUser },
      input: { appId: "daily-video" } as TAppByIdInputSchema,
    });

    // Verify that key is NOT in the response
    expect(result).not.toHaveProperty("key");
    expect(result).not.toHaveProperty("credential");
    expect(result).not.toHaveProperty("credentials");

    // Verify that other properties are preserved
    expect(result).toHaveProperty("slug", "daily-video");
    expect(result).toHaveProperty("name", "Cal Video");
    expect(result).toHaveProperty("isGlobal", true);
    expect(result).toHaveProperty("locationOption");
    expect(result).toHaveProperty("isInstalled", 1);

    // Verify sanitizeAppForViewer was called
    expect(sanitizeAppForViewer).toHaveBeenCalledWith(mockApp);
  });

  it("should throw BAD_REQUEST when app is not found", async () => {
    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
    vi.mocked(getApps).mockReturnValue([]);

    await expect(
      appByIdHandler({
        ctx: { user: mockUser },
        input: { appId: "non-existent-app" } as TAppByIdInputSchema,
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      appByIdHandler({
        ctx: { user: mockUser },
        input: { appId: "non-existent-app" } as TAppByIdInputSchema,
      })
    ).rejects.toThrow("Could not find app non-existent-app");
  });

  it("should preserve all non-sensitive properties", async () => {
    const mockApp: App & {
      credential: CredentialDataWithTeamName | null;
      credentials: CredentialDataWithTeamName[];
      locationOption: LocationOption | null;
    } = {
      type: "zoom_video",
      name: "Zoom",
      description: "Video conferencing",
      variant: "conferencing",
      slug: "zoom",
      categories: ["conferencing"],
      logo: "icon.svg",
      publisher: "Zoom",
      url: "https://zoom.us",
      email: "support@zoom.us",
      isGlobal: false,
      verified: true,
      trending: true,
      rating: 4.5,
      reviews: 1000,
      key: { api_key: "secret-zoom-key" },
      credential: null,
      credentials: [],
      locationOption: null,
    };

    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
    vi.mocked(getApps).mockReturnValue([mockApp]);

    const result = await appByIdHandler({
      ctx: { user: mockUser },
      input: { appId: "zoom" } as TAppByIdInputSchema,
    });

    // Verify sensitive fields are removed
    expect(result).not.toHaveProperty("key");
    expect(result).not.toHaveProperty("credential");
    expect(result).not.toHaveProperty("credentials");

    // Verify non-sensitive fields are preserved
    expect(result).toHaveProperty("slug", "zoom");
    expect(result).toHaveProperty("name", "Zoom");
    expect(result).toHaveProperty("verified", true);
    expect(result).toHaveProperty("trending", true);
    expect(result).toHaveProperty("rating", 4.5);
    expect(result).toHaveProperty("reviews", 1000);
    expect(result).toHaveProperty("isInstalled", 0);
  });

  it("should correctly set isInstalled based on credentials length", async () => {
    const mockCredential: CredentialDataWithTeamName = {
      id: 1,
      type: "google_calendar",
      key: { access_token: "token" },
      userId: 1,
      user: { email: "test@example.com" },
      teamId: null,
      appId: "google-calendar",
      invalid: false,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
      team: null,
    };

    const mockApp: App & {
      credential: CredentialDataWithTeamName | null;
      credentials: CredentialDataWithTeamName[];
      locationOption: LocationOption | null;
    } = {
      type: "google_calendar",
      name: "Google Calendar",
      description: "Calendar integration",
      variant: "calendar",
      slug: "google-calendar",
      categories: ["calendar"],
      logo: "icon.svg",
      publisher: "Google",
      url: "https://google.com",
      email: "support@google.com",
      key: { api_key: "secret-key" },
      credential: mockCredential,
      credentials: [mockCredential],
      locationOption: null,
    };

    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
    vi.mocked(getApps).mockReturnValue([mockApp]);

    const result = await appByIdHandler({
      ctx: { user: mockUser },
      input: { appId: "google-calendar" } as TAppByIdInputSchema,
    });

    expect(result.isInstalled).toBe(1);
    expect(result).not.toHaveProperty("key");
  });
});
