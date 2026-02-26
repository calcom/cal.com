import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../../logger", () => ({
  default: {
    getSubLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((obj: unknown) => JSON.stringify(obj)),
}));

describe("vercel domain management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PROJECT_ID_VERCEL", "test-project-id");
    vi.stubEnv("TEAM_ID_VERCEL", "test-team-id");
    vi.stubEnv("AUTH_BEARER_TOKEN_VERCEL", "test-bearer-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("createDomain", () => {
    it("returns true when no error in response", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      });

      const { createDomain } = await import("./vercel");
      const result = await createDomain("test.cal.dev");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("returns false when response parsing fails", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve("not an object"),
      });

      const { createDomain } = await import("./vercel");
      const result = await createDomain("test.cal.dev");

      expect(result).toBe(false);
    });

    it("returns true for domain_already_in_use error (idempotent)", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "domain_already_in_use" } }),
      });

      const { createDomain } = await import("./vercel");
      const result = await createDomain("test.cal.dev");

      expect(result).toBe(true);
    });

    it("throws HttpError for forbidden error", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "forbidden" } }),
      });

      const { createDomain } = await import("./vercel");

      await expect(createDomain("test.cal.dev")).rejects.toThrow("Vercel denied permission");
    });

    it("throws HttpError for domain_taken error", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "domain_taken" } }),
      });

      const { createDomain } = await import("./vercel");

      await expect(createDomain("test.cal.dev")).rejects.toThrow("already being used");
    });

    it("throws HttpError for unknown errors", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "unknown_error", domain: "test.cal.dev" } }),
      });

      const { createDomain } = await import("./vercel");

      await expect(createDomain("test.cal.dev")).rejects.toThrow("Failed to create domain");
    });
  });

  describe("deleteDomain", () => {
    it("returns true when no error in response", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      });

      const { deleteDomain } = await import("./vercel");
      const result = await deleteDomain("test.cal.dev");

      expect(result).toBe(true);
    });

    it("returns true when domain not_found (already deleted)", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "not_found" } }),
      });

      const { deleteDomain } = await import("./vercel");
      const result = await deleteDomain("test.cal.dev");

      expect(result).toBe(true);
    });

    it("throws HttpError for forbidden error", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "forbidden" } }),
      });

      const { deleteDomain } = await import("./vercel");

      await expect(deleteDomain("test.cal.dev")).rejects.toThrow("Vercel denied permission");
    });

    it("throws HttpError for unknown errors", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: "server_error", domain: "test.cal.dev" } }),
      });

      const { deleteDomain } = await import("./vercel");

      await expect(deleteDomain("test.cal.dev")).rejects.toThrow("Failed to take action");
    });
  });

  describe("assertVercelEnvVars", () => {
    it("throws for missing PROJECT_ID_VERCEL", async () => {
      vi.stubEnv("PROJECT_ID_VERCEL", "");
      mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({}) });

      const { createDomain } = await import("./vercel");

      await expect(createDomain("test.cal.dev")).rejects.toThrow("Missing env var: PROJECT_ID_VERCEL");
    });

    it("throws for missing AUTH_BEARER_TOKEN_VERCEL", async () => {
      vi.stubEnv("AUTH_BEARER_TOKEN_VERCEL", "");
      mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({}) });

      const { createDomain } = await import("./vercel");

      await expect(createDomain("test.cal.dev")).rejects.toThrow("Missing env var: AUTH_BEARER_TOKEN_VERCEL");
    });
  });
});
