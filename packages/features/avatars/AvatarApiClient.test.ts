import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarApiClient } from "./AvatarApiClient";

describe("AvatarApiClient", () => {
  let client: AvatarApiClient;

  beforeEach(() => {
    client = new AvatarApiClient({
      username: "test-user",
      password: "test-pass",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getImageUrl", () => {
    it("returns image URL on successful response", async () => {
      const mockImageUrl = "https://s3.avatarapi.com/some-image.png";

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        json: () => Promise.resolve({ Success: true, Image: mockImageUrl }),
      } as Response);

      const result = await client.getImageUrl("test@example.com");

      expect(result).toBe(mockImageUrl);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://avatarapi.com/v2/api.aspx",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            username: "test-user",
            password: "test-pass",
            email: "test@example.com",
          }),
        })
      );
    });

    it("returns null when avatar is not found", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        json: () => Promise.resolve({ Success: false, Error: "Not found" }),
      } as Response);

      const result = await client.getImageUrl("unknown@example.com");

      expect(result).toBeNull();
    });

    it("returns null and warns on API error", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        json: () => Promise.resolve({ Success: false, Error: "Rate limit exceeded" }),
      } as Response);

      const result = await client.getImageUrl("test@example.com");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Avatar API error:", "Rate limit exceeded");
    });

    it("returns null on network error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

      const result = await client.getImageUrl("test@example.com");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Avatar API request failed:", expect.any(Error));
    });

    it("returns null on timeout (AbortError)", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const abortError = new DOMException("The operation was aborted", "AbortError");
      vi.spyOn(global, "fetch").mockRejectedValueOnce(abortError);

      const result = await client.getImageUrl("test@example.com");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Avatar API request timed out");
    });

    it("uses configured timeout", () => {
      const customClient = new AvatarApiClient({
        username: "user",
        password: "pass",
        timeoutMs: 5000,
      });

      expect(customClient).toBeInstanceOf(AvatarApiClient);
    });
  });

  describe("fromEnv", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns AvatarApiClient when credentials are set", () => {
      process.env.AVATARAPI_USERNAME = "env-user";
      process.env.AVATARAPI_PASSWORD = "env-pass";

      const result = AvatarApiClient.fromEnv();

      expect(result).toBeInstanceOf(AvatarApiClient);
    });

    it("returns null when username is missing", () => {
      delete process.env.AVATARAPI_USERNAME;
      process.env.AVATARAPI_PASSWORD = "env-pass";

      const result = AvatarApiClient.fromEnv();

      expect(result).toBeNull();
    });

    it("returns null when password is missing", () => {
      process.env.AVATARAPI_USERNAME = "env-user";
      delete process.env.AVATARAPI_PASSWORD;

      const result = AvatarApiClient.fromEnv();

      expect(result).toBeNull();
    });

    it("returns null when both credentials are missing", () => {
      delete process.env.AVATARAPI_USERNAME;
      delete process.env.AVATARAPI_PASSWORD;

      const result = AvatarApiClient.fromEnv();

      expect(result).toBeNull();
    });
  });
});
