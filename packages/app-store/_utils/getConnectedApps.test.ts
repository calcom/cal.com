import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import { getConnectedApps } from "./getConnectedApps";

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(async () => []),
}));

vi.mock("./getEnabledAppsFromCredentials", () => ({
  default: vi.fn(),
}));

import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";

import getEnabledAppsFromCredentials from "./getEnabledAppsFromCredentials";

const user = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  avatarUrl: null,
} as Parameters<typeof getConnectedApps>[0]["user"];

const baseApp = {
  slug: "zoom",
  name: "Zoom",
  description: "Zoom Video",
  type: "zoom_video",
  variant: "conferencing",
  logo: "/zoom-logo.svg",
  categories: ["conferencing"],
  publisher: "Cal.com",
  url: "https://zoom.us",
  email: "help@cal.com",
  isGlobal: false,
  dirName: "zoomvideo",
  locationOption: null,
  enabled: true,
};

function mockEnabledApps(apps: Record<string, unknown>[]) {
  vi.mocked(getEnabledAppsFromCredentials).mockResolvedValue(
    apps as unknown as Awaited<ReturnType<typeof getEnabledAppsFromCredentials>>
  );
}

describe("getConnectedApps - field exposure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
  });

  it("does not leak credentials, credential or key fields to the response", async () => {
    mockEnabledApps([
      {
        ...baseApp,
        credentials: [{ id: 99, key: { secret: "super-secret" } }],
        credential: { id: 99, key: { secret: "super-secret" } },
        key: { apiKey: "global-secret" },
      },
    ]);

    const result = await getConnectedApps({ user, input: {}, prisma: {} as PrismaClient });
    const app = result.items[0];

    expect(app).not.toHaveProperty("credentials");
    expect(app).not.toHaveProperty("credential");
    expect(app).not.toHaveProperty("key");
  });

  it("does not leak an unexpected field added to the app shape (allow-list, not deny-list)", async () => {
    mockEnabledApps([
      {
        ...baseApp,
        internalSecretField: "should-never-reach-frontend",
      },
    ]);

    const result = await getConnectedApps({ user, input: {}, prisma: {} as PrismaClient });
    const app = result.items[0];

    expect(app).not.toHaveProperty("internalSecretField");
  });

  it("preserves the safe fields consumers depend on", async () => {
    mockEnabledApps([baseApp]);

    const result = await getConnectedApps({ user, input: {}, prisma: {} as PrismaClient });
    const app = result.items[0];

    expect(app.slug).toBe("zoom");
    expect(app.name).toBe("Zoom");
    expect(app.description).toBe("Zoom Video");
    expect(app.type).toBe("zoom_video");
    expect(app.variant).toBe("conferencing");
    expect(app.logo).toBe("/zoom-logo.svg");
    expect(app.categories).toEqual(["conferencing"]);
    expect(app).toHaveProperty("userCredentialIds");
    expect(app).toHaveProperty("invalidCredentialIds");
    expect(app).toHaveProperty("teams");
    expect(app).toHaveProperty("isInstalled");
  });
});
