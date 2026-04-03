import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockBuildCookie = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ name: "onboarding-embed-verified", value: "signed-value", maxAge: 3600 })
);

vi.mock("@lib/onboarding-embed-verified-cookie", () => ({
  buildOnboardingEmbedVerifiedCookie: mockBuildCookie,
}));

const mockFindFirst = vi.hoisted(() => vi.fn());
vi.mock("@calcom/prisma", () => ({
  default: {
    oAuthClient: {
      findFirst: mockFindFirst,
    },
  },
}));

const mockIsRedirectUriRegistered = vi.hoisted(() => vi.fn());
vi.mock("@calcom/features/oauth/utils/validateRedirectUris", () => ({
  isRedirectUriRegistered: mockIsRedirectUriRegistered,
}));

import { GET } from "../route";

const BASE_URL = "http://localhost:3000";

function createRequest(params: Record<string, string>) {
  const url = new URL("/api/onboarding-embed/verify", BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const VALID_PARAMS = {
  client_id: "valid-client-id",
  redirect_uri: "https://your-app.com/callback",
  scope: "EVENT_TYPE_READ",
  state: "random-state",
  embed: "true",
  theme: "dark",
};

const MOCK_OAUTH_CLIENT = {
  clientId: "valid-client-id",
  redirectUris: ["https://your-app.com/callback"],
  redirectUri: "https://your-app.com/callback",
  clientType: "CONFIDENTIAL" as const,
  name: "Test Client",
  purpose: null,
  logo: null,
  websiteUrl: null,
  rejectionReason: null,
  isTrusted: false,
  status: "APPROVED" as const,
  userId: 1,
  scopes: [],
  createdAt: new Date(),
};

describe("GET /api/onboarding-embed/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "test-key-at-least-32-characters!!");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Valid OAuth client and redirect URI", () => {
    it("should set cookie and redirect to embed page", async () => {
      mockFindFirst.mockResolvedValue(MOCK_OAUTH_CLIENT);
      mockIsRedirectUriRegistered.mockReturnValue(true);

      const req = createRequest(VALID_PARAMS);
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/onboarding/getting-started/embed");
      expect(location).toContain("client_id=valid-client-id");
      expect(location).toContain("redirect_uri=");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("onboarding-embed-verified");
      expect(setCookie).toContain("signed-value");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=None");

      expect(mockBuildCookie).toHaveBeenCalledWith("https://your-app.com");
    });

    it("should pass all query params to the embed page redirect", async () => {
      mockFindFirst.mockResolvedValue(MOCK_OAUTH_CLIENT);
      mockIsRedirectUriRegistered.mockReturnValue(true);

      const req = createRequest(VALID_PARAMS);
      const res = await GET(req);

      const location = new URL(res.headers.get("location")!);
      expect(location.searchParams.get("client_id")).toBe("valid-client-id");
      expect(location.searchParams.get("redirect_uri")).toBe("https://your-app.com/callback");
      expect(location.searchParams.get("scope")).toBe("EVENT_TYPE_READ");
      expect(location.searchParams.get("state")).toBe("random-state");
      expect(location.searchParams.get("theme")).toBe("dark");
      expect(location.searchParams.get("embed")).toBe("true");
    });
  });

  describe("Invalid OAuth client", () => {
    it("should redirect to embed page without cookie when client_id is missing", async () => {
      const { client_id, ...paramsWithoutClientId } = VALID_PARAMS;
      const req = createRequest(paramsWithoutClientId);
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/onboarding/getting-started/embed");
      expect(mockBuildCookie).not.toHaveBeenCalled();
    });

    it("should redirect to embed page without cookie when client_id is not found in DB", async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = createRequest(VALID_PARAMS);
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/onboarding/getting-started/embed");
      expect(mockBuildCookie).not.toHaveBeenCalled();
    });
  });

  describe("Invalid redirect URI", () => {
    it("should redirect to embed page without cookie when redirect_uri is missing", async () => {
      mockFindFirst.mockResolvedValue(MOCK_OAUTH_CLIENT);
      const { redirect_uri, ...paramsWithoutRedirectUri } = VALID_PARAMS;
      const req = createRequest(paramsWithoutRedirectUri);
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/onboarding/getting-started/embed");
      expect(mockBuildCookie).not.toHaveBeenCalled();
    });

    it("should redirect to embed page without cookie when redirect_uri is not registered", async () => {
      mockFindFirst.mockResolvedValue(MOCK_OAUTH_CLIENT);
      mockIsRedirectUriRegistered.mockReturnValue(false);

      const req = createRequest({
        ...VALID_PARAMS,
        redirect_uri: "https://evil.com/callback",
      });
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/onboarding/getting-started/embed");
      expect(mockBuildCookie).not.toHaveBeenCalled();
    });
  });


});
