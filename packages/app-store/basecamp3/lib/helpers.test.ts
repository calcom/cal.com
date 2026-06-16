import type { CredentialPayload } from "@calcom/types/Credential";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshAccessToken } from "./helpers";
import type { BasecampToken } from "./types";

const {
  mockGetBasecampKeys,
  mockCredentialUpdate,
}: {
  mockGetBasecampKeys: ReturnType<typeof vi.fn>;
  mockCredentialUpdate: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => ({
  mockGetBasecampKeys: vi.fn(),
  mockCredentialUpdate: vi.fn(),
}));

vi.mock("./getBasecampKeys", () => ({
  getBasecampKeys: mockGetBasecampKeys,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    credential: {
      update: mockCredentialUpdate,
    },
  },
}));

const baseCredentialKey: BasecampToken = {
  projectId: 123,
  expires_at: 1700000000000,
  expires_in: 1209600,
  scheduleId: 456,
  access_token: "old-access-token",
  refresh_token: "refresh-token-with symbols",
  account: {
    id: 789,
    href: "https://3.basecampapi.com/789",
    name: "Example account",
    hidden: false,
    product: "bc3",
    app_href: "https://3.basecamp.com/789",
  },
};

const credential = {
  id: 42,
  key: baseCredentialKey,
} as unknown as CredentialPayload;

describe("refreshAccessToken", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.spyOn(Date, "now").mockReturnValue(1710000000000);
    mockGetBasecampKeys.mockResolvedValue({
      client_id: "basecamp-client-id",
      client_secret: "basecamp-client-secret",
      user_agent: "cal-diy-test-agent",
    });
    mockFetch.mockResolvedValue({
      json: async () => ({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 1209600,
      }),
    });
    mockCredentialUpdate.mockImplementation(async ({ data }) => ({ key: data.key }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("refreshes tokens using Basecamp's documented refresh-token request", async () => {
    await refreshAccessToken(credential);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [refreshUrl, requestInit] = mockFetch.mock.calls[0];
    const parsedRefreshUrl = new URL(refreshUrl);

    expect(parsedRefreshUrl.origin + parsedRefreshUrl.pathname).toBe(
      "https://launchpad.37signals.com/authorization/token"
    );
    expect(parsedRefreshUrl.searchParams.get("type")).toBe("refresh");
    expect(parsedRefreshUrl.searchParams.get("refresh_token")).toBe(baseCredentialKey.refresh_token);
    expect(parsedRefreshUrl.searchParams.get("client_id")).toBe("basecamp-client-id");
    expect(parsedRefreshUrl.searchParams.get("client_secret")).toBe("basecamp-client-secret");
    expect(parsedRefreshUrl.searchParams.has("redirect_uri")).toBe(false);
    expect(requestInit).toEqual({
      method: "POST",
      headers: { "User-Agent": "cal-diy-test-agent" },
    });
  });

  it("stores the refreshed token data on the existing credential", async () => {
    const refreshedKey = await refreshAccessToken(credential);

    const expectedKey = {
      ...baseCredentialKey,
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 1209600,
      expires_at: 1710000000000 + 1000 * 3600 * 24 * 14,
    };

    expect(mockCredentialUpdate).toHaveBeenCalledWith({
      where: { id: credential.id },
      data: { key: expectedKey },
    });
    expect(refreshedKey).toEqual(expectedKey);
  });
});
