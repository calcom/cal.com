import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create hoisted mocks
const { mockFetch, mockPrisma, mockGetAppKeysFromSlug, mockDecodeOAuthState } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
    mockPrisma: {
      credential: {
        create: vi.fn(),
      },
    },
    mockGetAppKeysFromSlug: vi.fn(),
    mockDecodeOAuthState: vi.fn(),
  };
});

vi.stubGlobal("fetch", mockFetch);

vi.mock("@calcom/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: mockGetAppKeysFromSlug,
}));

vi.mock("../../_utils/oauth/decodeOAuthState", () => ({
  decodeOAuthState: mockDecodeOAuthState,
}));

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
}));

vi.mock("@calcom/lib/getSafeRedirectUrl", () => ({
  getSafeRedirectUrl: vi.fn((url) => url),
}));

vi.mock("../../_utils/getInstalledAppPath", () => ({
  default: vi.fn(() => "/apps/installed/other"),
}));

vi.mock("@calcom/lib/server/defaultHandler", () => ({
  defaultHandler: vi.fn((handlers) => handlers),
}));

vi.mock("@calcom/lib/server/defaultResponder", () => ({
  defaultResponder: vi.fn((handler) => handler),
}));

describe("Lever OAuth Callback", () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      query: {},
      session: {
        user: { id: 123 },
      },
    };

    mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "test_client_id",
      client_secret: "test_client_secret",
      audience: "https://api.lever.co/v1/",
    });

    mockDecodeOAuthState.mockReturnValue({
      returnTo: "/settings/my-account/calendars",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Successful OAuth flow", () => {
    it("should exchange code for tokens and create credential", async () => {
      mockReq.query = { code: "valid_auth_code" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "lever_access_token",
            refresh_token: "lever_refresh_token",
            expires_in: 3600,
          }),
      });

      // Import handler after mocks are set up
      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify token exchange request
      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.lever.co/oauth/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: expect.any(URLSearchParams),
        })
      );

      // Verify credential was created
      expect(mockPrisma.credential.create).toHaveBeenCalledWith({
        data: {
          type: "lever_other",
          key: {
            access_token: "lever_access_token",
            refresh_token: "lever_refresh_token",
            expires_at: expect.any(Number),
          },
          userId: 123,
          appId: "lever",
        },
      });

      // Verify redirect to success URL
      expect(mockRes.redirect).toHaveBeenCalledWith("/settings/my-account/calendars");
    });

    it("should handle token response without refresh_token", async () => {
      mockReq.query = { code: "valid_auth_code" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "lever_access_token",
            expires_in: 3600,
          }),
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockPrisma.credential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: expect.objectContaining({
              access_token: "lever_access_token",
              refresh_token: undefined,
            }),
          }),
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should redirect on missing code with returnTo", async () => {
      mockReq.query = {};
      mockDecodeOAuthState.mockReturnValue({
        returnTo: "/error-return",
        onErrorReturnTo: "/error-handler",
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.redirect).toHaveBeenCalledWith("/error-handler");
    });

    it("should throw HttpError on missing code without returnTo", async () => {
      mockReq.query = {};
      mockDecodeOAuthState.mockReturnValue(null);

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await expect(handler(mockReq as NextApiRequest, mockRes as NextApiResponse)).rejects.toThrow(
        "`code` must be a string"
      );
    });

    it("should throw HttpError when user is not logged in", async () => {
      mockReq.query = { code: "valid_code" };
      mockReq.session = {};

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await expect(handler(mockReq as NextApiRequest, mockRes as NextApiResponse)).rejects.toThrow(
        "You must be logged in to do this"
      );
    });

    it("should return error when client_id is missing", async () => {
      mockReq.query = { code: "valid_code" };
      mockGetAppKeysFromSlug.mockResolvedValue({
        client_secret: "secret",
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Lever client_id missing." });
    });

    it("should return error when client_secret is missing", async () => {
      mockReq.query = { code: "valid_code" };
      mockGetAppKeysFromSlug.mockResolvedValue({
        client_id: "id",
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Lever client_secret missing." });
    });

    it("should redirect with error on OAuth token exchange failure", async () => {
      mockReq.query = { code: "invalid_code" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("invalid_grant"),
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining("error=Error")
      );
    });

    it("should correctly append error query param when redirect URL already has params", async () => {
      mockReq.query = { code: "invalid_code" };
      mockDecodeOAuthState.mockReturnValue({
        returnTo: "/settings?existing=param",
        onErrorReturnTo: "/settings?existing=param",
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("invalid_grant"),
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const redirectCall = mockRes.redirect as ReturnType<typeof vi.fn>;
      const redirectUrl = redirectCall.mock.calls[0][0];
      
      // Should use & instead of ? when URL already has query params
      expect(redirectUrl).toContain("existing=param");
      expect(redirectUrl).toContain("error=");
      // Should NOT have ?...? pattern (invalid URL)
      expect(redirectUrl).not.toMatch(/\?.*\?/);
    });
  });

  describe("Token request parameters", () => {
    it("should include correct parameters in token exchange", async () => {
      mockReq.query = { code: "test_code" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "token",
            expires_in: 3600,
          }),
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const fetchCall = mockFetch.mock.calls[0];
      const body = fetchCall[1].body as URLSearchParams;

      expect(body.get("client_id")).toBe("test_client_id");
      expect(body.get("client_secret")).toBe("test_client_secret");
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("test_code");
      expect(body.get("redirect_uri")).toBe("https://app.cal.com/api/integrations/lever/callback");
      expect(body.get("audience")).toBe("https://api.lever.co/v1/");
    });
  });

  describe("Expiry calculation", () => {
    it("should calculate expires_at correctly", async () => {
      mockReq.query = { code: "valid_code" };
      const now = Date.now();
      vi.setSystemTime(now);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "token",
            expires_in: 7200, // 2 hours
          }),
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const createCall = mockPrisma.credential.create.mock.calls[0][0];
      const expiresAt = createCall.data.key.expires_at;

      // Should be approximately now + 7200 * 1000
      expect(expiresAt).toBeGreaterThanOrEqual(now + 7200 * 1000 - 1000);
      expect(expiresAt).toBeLessThanOrEqual(now + 7200 * 1000 + 1000);

      vi.useRealTimers();
    });

    it("should default to 24 hours when expires_in is not provided", async () => {
      mockReq.query = { code: "valid_code" };
      const now = Date.now();
      vi.setSystemTime(now);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "token",
            // no expires_in
          }),
      });

      const callbackModule = await import("./callback");
      const handlers = callbackModule.default;
      const getHandler = await handlers.GET;
      const handler = await getHandler.default;

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const createCall = mockPrisma.credential.create.mock.calls[0][0];
      const expiresAt = createCall.data.key.expires_at;

      // Should default to 24 hours (86400 seconds)
      expect(expiresAt).toBeGreaterThanOrEqual(now + 86400 * 1000 - 1000);
      expect(expiresAt).toBeLessThanOrEqual(now + 86400 * 1000 + 1000);

      vi.useRealTimers();
    });
  });
});
