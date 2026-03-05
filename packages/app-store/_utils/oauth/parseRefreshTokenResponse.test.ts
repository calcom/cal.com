import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

const appSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expiry_date: z.number(),
});

describe("parseRefreshTokenResponse", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should parse valid response with app schema when credential sync disabled", async () => {
    delete process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;
    const { default: parseRefreshTokenResponse } = await import("./parseRefreshTokenResponse");

    const response = {
      access_token: "new_access",
      refresh_token: "new_refresh",
      expiry_date: 1700000000000,
    };
    const result = parseRefreshTokenResponse(response, appSchema);
    expect(result.access_token).toBe("new_access");
    expect(result.refresh_token).toBe("new_refresh");
  });

  it("should throw when response is invalid", async () => {
    delete process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;
    const { default: parseRefreshTokenResponse } = await import("./parseRefreshTokenResponse");

    expect(() => parseRefreshTokenResponse({ invalid: "data" }, appSchema)).toThrow(
      "Invalid refreshed tokens were returned"
    );
  });

  it("should use minimumTokenResponseSchema when credential sync enabled", async () => {
    process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT = "https://sync.example.com";

    // Need to also mock the constant
    vi.doMock("@calcom/lib/constants", async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return {
        ...original,
        APP_CREDENTIAL_SHARING_ENABLED: true,
      };
    });

    const { default: parseRefreshTokenResponse } = await import("./parseRefreshTokenResponse");

    const response = {
      access_token: "new_access",
      expiry_date: 1700000000000,
    };
    const result = parseRefreshTokenResponse(response, appSchema);
    expect(result.access_token).toBe("new_access");
  });

  it("should add placeholder refresh_token when sync enabled and none returned", async () => {
    process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT = "https://sync.example.com";

    vi.doMock("@calcom/lib/constants", async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return {
        ...original,
        APP_CREDENTIAL_SHARING_ENABLED: true,
      };
    });

    const { default: parseRefreshTokenResponse } = await import("./parseRefreshTokenResponse");

    const response = {
      access_token: "new_access",
      expiry_date: 1700000000000,
    };
    const result = parseRefreshTokenResponse(response, appSchema);
    expect(result.refresh_token).toBe("refresh_token");
  });

  it("should preserve existing refresh_token when present", async () => {
    delete process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;
    const { default: parseRefreshTokenResponse } = await import("./parseRefreshTokenResponse");

    const response = {
      access_token: "new_access",
      refresh_token: "existing_refresh",
      expiry_date: 1700000000000,
    };
    const result = parseRefreshTokenResponse(response, appSchema);
    expect(result.refresh_token).toBe("existing_refresh");
  });
});
