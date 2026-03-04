import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHomedir = "/tmp/test-home";
const mockFs: {
  existsSync: ReturnType<typeof vi.fn>;
  mkdirSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
} = {
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
};

const mockFetch: ReturnType<typeof vi.fn> = vi.fn();

vi.mock("node:fs", () => mockFs);
vi.mock("node:os", () => ({
  homedir: () => mockHomedir,
}));
vi.stubGlobal("fetch", mockFetch);

describe("config", () => {
  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();
    mockFetch.mockReset();
    delete process.env.CAL_API_KEY;
    delete process.env.CAL_API_URL;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("readConfig", () => {
    it("creates config dir if it does not exist", async () => {
      mockFs.existsSync.mockReturnValue(false);
      const { readConfig } = await import("./config");
      readConfig();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(".calcom"), { recursive: true });
    });

    it("returns empty object if config file does not exist", async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).endsWith(".calcom")) return true;
        return false;
      });
      const { readConfig } = await import("./config");
      const config = readConfig();
      expect(config).toEqual({});
    });

    it("reads and parses config file", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({ apiKey: "cal_test123", apiUrl: "https://custom.api.com" })
      );
      const { readConfig } = await import("./config");
      const config = readConfig();
      expect(config).toEqual({ apiKey: "cal_test123", apiUrl: "https://custom.api.com" });
    });

    it("returns empty object on parse error", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("invalid json{{{");
      const { readConfig } = await import("./config");
      const config = readConfig();
      expect(config).toEqual({});
    });
  });

  describe("writeConfig", () => {
    it("creates config dir and writes config file", async () => {
      mockFs.existsSync.mockReturnValue(false);
      const { writeConfig } = await import("./config");
      writeConfig({ apiKey: "cal_test456" });
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("config.json"),
        JSON.stringify({ apiKey: "cal_test456" }, null, 2),
        { encoding: "utf-8", mode: 0o600 }
      );
    });
  });

  describe("getApiKey", () => {
    it("returns API key from environment variable", async () => {
      process.env.CAL_API_KEY = "cal_env_key";
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      const { getApiKey } = await import("./config");
      expect(await getApiKey()).toBe("cal_env_key");
    });

    it("returns API key from config file", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey: "cal_config_key" }));
      const { getApiKey } = await import("./config");
      expect(await getApiKey()).toBe("cal_config_key");
    });

    it("prefers env var over config file", async () => {
      process.env.CAL_API_KEY = "cal_env_key";
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey: "cal_config_key" }));
      const { getApiKey } = await import("./config");
      expect(await getApiKey()).toBe("cal_env_key");
    });

    it("exits with error if no API key found", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { getApiKey } = await import("./config");
      await expect(getApiKey()).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("getAuthToken with OAuth", () => {
    it("returns OAuth access token when not expired", async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          oauth: {
            clientId: "test-client",
            clientSecret: "test-secret",
            accessToken: "oauth_token_valid",
            refreshToken: "refresh_token",
            accessTokenExpiresAt: futureDate,
          },
        })
      );
      const { getAuthToken } = await import("./config");
      expect(await getAuthToken()).toBe("oauth_token_valid");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("automatically refreshes expired OAuth token", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          oauth: {
            clientId: "test-client",
            clientSecret: "test-secret",
            accessToken: "oauth_token_expired",
            refreshToken: "old_refresh_token",
            accessTokenExpiresAt: pastDate,
          },
        })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new_access_token",
          refresh_token: "new_refresh_token",
          expires_in: 3600,
        }),
      });

      const { getAuthToken } = await import("./config");
      const token = await getAuthToken();

      expect(token).toBe("new_access_token");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/v2/auth/oauth2/token");
      const body = JSON.parse(options.body as string);
      expect(body.grant_type).toBe("refresh_token");
      expect(body.refresh_token).toBe("old_refresh_token");
      expect(body.client_id).toBe("test-client");
      expect(body.client_secret).toBe("test-secret");

      // Verify new tokens were persisted
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenConfig.oauth.accessToken).toBe("new_access_token");
      expect(writtenConfig.oauth.refreshToken).toBe("new_refresh_token");
    });

    it("refreshes token within 60-second expiry buffer", async () => {
      const nearFutureDate = new Date(Date.now() + 30000).toISOString();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          oauth: {
            clientId: "test-client",
            clientSecret: "test-secret",
            accessToken: "almost_expired_token",
            refreshToken: "refresh_token",
            accessTokenExpiresAt: nearFutureDate,
          },
        })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "refreshed_token",
          refresh_token: "new_refresh",
          expires_in: 3600,
        }),
      });

      const { getAuthToken } = await import("./config");
      const token = await getAuthToken();

      expect(token).toBe("refreshed_token");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("exits when token refresh fails", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          oauth: {
            clientId: "test-client",
            clientSecret: "test-secret",
            accessToken: "oauth_token_expired",
            refreshToken: "bad_refresh_token",
            accessTokenExpiresAt: pastDate,
          },
        })
      );

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Invalid refresh token",
      });

      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { getAuthToken } = await import("./config");
      await expect(getAuthToken()).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("token refresh failed"));
    });

    it("treats invalid accessTokenExpiresAt as expired and refreshes", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          oauth: {
            clientId: "test-client",
            clientSecret: "test-secret",
            accessToken: "oauth_token",
            refreshToken: "refresh_token",
            accessTokenExpiresAt: "not-a-valid-date",
          },
        })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "refreshed_token",
          refresh_token: "new_refresh",
          expires_in: 3600,
        }),
      });

      const { getAuthToken } = await import("./config");
      const token = await getAuthToken();
      expect(token).toBe("refreshed_token");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("uses custom apiUrl from config for token refresh", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          apiUrl: "https://custom.cal.com",
          oauth: {
            clientId: "test-client",
            clientSecret: "test-secret",
            accessToken: "oauth_token_expired",
            refreshToken: "refresh_token",
            accessTokenExpiresAt: pastDate,
          },
        })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new_token",
          refresh_token: "new_refresh",
          expires_in: 3600,
        }),
      });

      const { getAuthToken } = await import("./config");
      await getAuthToken();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://custom.cal.com/v2/auth/oauth2/token");
    });
  });

  describe("getApiUrl", () => {
    it("returns default API URL", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      const { getApiUrl } = await import("./config");
      expect(getApiUrl()).toBe("https://api.cal.com");
    });

    it("returns API URL from environment variable", async () => {
      process.env.CAL_API_URL = "https://custom.api.com";
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      const { getApiUrl } = await import("./config");
      expect(getApiUrl()).toBe("https://custom.api.com");
    });

    it("returns API URL from config file", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiUrl: "https://config.api.com" }));
      const { getApiUrl } = await import("./config");
      expect(getApiUrl()).toBe("https://config.api.com");
    });
  });
});
