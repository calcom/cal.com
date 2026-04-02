import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSalesforceTokenLifetime } from "../getSalesforceTokenLifetime";

vi.mock("../getSalesforceAppKeys", () => ({
  getSalesforceAppKeys: vi.fn().mockResolvedValue({
    consumer_key: "test_consumer_key",
    consumer_secret: "test_consumer_secret",
  }),
}));

describe("getSalesforceTokenLifetime", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return token lifetime calculated from exp and iat", async () => {
    const iat = 1700000000;
    const exp = 1700003600; // 1 hour later (3600 seconds)
    const expectedLifetime = exp - iat;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iat, exp }),
    });

    const result = await getSalesforceTokenLifetime({
      accessToken: "test_access_token",
      instanceUrl: "https://test.salesforce.com",
    });

    expect(result).toBe(expectedLifetime);
    expect(result).toBe(3600);
  });

  it("should call the introspection endpoint with correct parameters", async () => {
    const iat = 1700000000;
    const exp = 1700007200;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iat, exp }),
    });

    await getSalesforceTokenLifetime({
      accessToken: "my_access_token",
      instanceUrl: "https://my-instance.salesforce.com",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://my-instance.salesforce.com/services/oauth2/introspect",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      })
    );

    const callArgs = mockFetch.mock.calls[0];
    const body = callArgs[1].body as URLSearchParams;
    expect(body.get("token")).toBe("my_access_token");
    expect(body.get("token_type_hint")).toBe("access_token");
  });

  it("should use Basic auth with base64 encoded credentials", async () => {
    const iat = 1700000000;
    const exp = 1700007200;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iat, exp }),
    });

    await getSalesforceTokenLifetime({
      accessToken: "test_token",
      instanceUrl: "https://test.salesforce.com",
    });

    const expectedAuth = `Basic ${Buffer.from("test_consumer_key:test_consumer_secret").toString("base64")}`;
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe(expectedAuth);
  });

  it("should throw error when introspection fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Unauthorized",
    });

    await expect(
      getSalesforceTokenLifetime({
        accessToken: "invalid_token",
        instanceUrl: "https://test.salesforce.com",
      })
    ).rejects.toThrow("Token introspection failed: Unauthorized");
  });

  it("should handle different token lifetimes", async () => {
    const iat = 1700000000;
    const exp = 1700086400; // 24 hours later (86400 seconds)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iat, exp }),
    });

    const result = await getSalesforceTokenLifetime({
      accessToken: "test_token",
      instanceUrl: "https://test.salesforce.com",
    });

    expect(result).toBe(86400);
  });
});
