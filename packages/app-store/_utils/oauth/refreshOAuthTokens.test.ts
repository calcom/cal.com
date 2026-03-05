import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("refreshOAuthTokens", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should call sync endpoint when credential sync is enabled and userId present", async () => {
    process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT = "https://sync.example.com";

    vi.doMock("@calcom/lib/constants", async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return {
        ...original,
        APP_CREDENTIAL_SHARING_ENABLED: true,
        CREDENTIAL_SYNC_SECRET: "test-secret",
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: "x-cal-secret",
      };
    });

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ access_token: "synced" }) });
    global.fetch = mockFetch;

    const { default: refreshOAuthTokens } = await import("./refreshOAuthTokens");

    const refreshFn = vi.fn();
    await refreshOAuthTokens(refreshFn, "google-calendar", 123);

    expect(mockFetch).toHaveBeenCalledWith("https://sync.example.com", expect.any(Object));
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it("should call refreshFunction when sync is disabled", async () => {
    delete process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;

    vi.doMock("@calcom/lib/constants", async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return {
        ...original,
        APP_CREDENTIAL_SHARING_ENABLED: false,
        CREDENTIAL_SYNC_SECRET: "",
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: "x-cal-secret",
      };
    });

    const { default: refreshOAuthTokens } = await import("./refreshOAuthTokens");

    const refreshFn = vi.fn().mockResolvedValue({ access_token: "refreshed" });
    const result = await refreshOAuthTokens(refreshFn, "google-calendar", 123);

    expect(refreshFn).toHaveBeenCalled();
    expect(result).toEqual({ access_token: "refreshed" });
  });

  it("should call refreshFunction when userId is null even if sync enabled", async () => {
    process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT = "https://sync.example.com";

    vi.doMock("@calcom/lib/constants", async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return {
        ...original,
        APP_CREDENTIAL_SHARING_ENABLED: true,
        CREDENTIAL_SYNC_SECRET: "test-secret",
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: "x-cal-secret",
      };
    });

    const { default: refreshOAuthTokens } = await import("./refreshOAuthTokens");

    const refreshFn = vi.fn().mockResolvedValue({ access_token: "refreshed" });
    await refreshOAuthTokens(refreshFn, "google-calendar", null);

    expect(refreshFn).toHaveBeenCalled();
  });

  it("should call refreshFunction when env vars are missing", async () => {
    delete process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;

    vi.doMock("@calcom/lib/constants", async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return {
        ...original,
        APP_CREDENTIAL_SHARING_ENABLED: true,
        CREDENTIAL_SYNC_SECRET: "",
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: "x-cal-secret",
      };
    });

    const { default: refreshOAuthTokens } = await import("./refreshOAuthTokens");

    const refreshFn = vi.fn().mockResolvedValue({ access_token: "refreshed" });
    await refreshOAuthTokens(refreshFn, "google-calendar", 123);

    expect(refreshFn).toHaveBeenCalled();
  });
});
