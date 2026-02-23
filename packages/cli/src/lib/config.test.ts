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

vi.mock("node:fs", () => mockFs);
vi.mock("node:os", () => ({
  homedir: () => mockHomedir,
}));

describe("config", () => {
  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();
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
      expect(getApiKey()).toBe("cal_env_key");
    });

    it("returns API key from config file", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey: "cal_config_key" }));
      const { getApiKey } = await import("./config");
      expect(getApiKey()).toBe("cal_config_key");
    });

    it("prefers env var over config file", async () => {
      process.env.CAL_API_KEY = "cal_env_key";
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey: "cal_config_key" }));
      const { getApiKey } = await import("./config");
      expect(getApiKey()).toBe("cal_env_key");
    });

    it("exits with error if no API key found", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { getApiKey } = await import("./config");
      expect(() => getApiKey()).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalled();
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
