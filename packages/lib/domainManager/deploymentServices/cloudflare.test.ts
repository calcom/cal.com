import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((v: unknown) => JSON.stringify(v)),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("cloudflare deployment service", () => {
  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "test-zone-id");
    vi.stubEnv("CLOUDFLARE_VERCEL_CNAME", "cname.vercel-dns.com");
    vi.stubEnv("AUTH_BEARER_TOKEN_CLOUDFLARE", "test-bearer-token");
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("addDnsRecord", () => {
    it("creates a CNAME record successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: "record-123" },
            errors: null,
          }),
      });

      const { addDnsRecord } = await import("./cloudflare");
      const result = await addDnsRecord("test.example.com");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/dns_records"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-bearer-token",
          }),
        })
      );
    });

    it("returns true when CNAME already exists", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            errors: [{ code: 81053 }],
            result: null,
          }),
      });

      const { addDnsRecord } = await import("./cloudflare");
      const result = await addDnsRecord("existing.example.com");
      expect(result).toBe(true);
    });

    it("returns true when record already exists (code 81057)", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            errors: [{ code: 81057 }],
            result: null,
          }),
      });

      const { addDnsRecord } = await import("./cloudflare");
      const result = await addDnsRecord("existing.example.com");
      expect(result).toBe(true);
    });

    it("throws HttpError on non-already-exists failure", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            errors: [{ code: 99999 }],
            result: null,
          }),
      });

      const { addDnsRecord } = await import("./cloudflare");
      await expect(addDnsRecord("fail.example.com")).rejects.toThrow("Failed to create dns-record");
    });

    it("throws when env vars are missing", async () => {
      vi.stubEnv("CLOUDFLARE_VERCEL_CNAME", "");

      const { addDnsRecord } = await import("./cloudflare");
      await expect(addDnsRecord("test.example.com")).rejects.toThrow("Missing env var");
    });
  });

  describe("deleteDnsRecord", () => {
    it("deletes a DNS record successfully", async () => {
      // First call: search for the record
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: [{ id: "record-to-delete" }],
          }),
      });
      // Second call: delete the record
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { id: "record-to-delete" },
            errors: null,
          }),
      });

      const { deleteDnsRecord } = await import("./cloudflare");
      const result = await deleteDnsRecord("test.example.com");
      expect(result).toBe(true);
    });

    it("returns true when record not found (nothing to delete)", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: [],
          }),
      });

      const { deleteDnsRecord } = await import("./cloudflare");
      const result = await deleteDnsRecord("nonexistent.example.com");
      expect(result).toBe(true);
    });

    it("throws when search fails", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            result: null,
          }),
      });

      const { deleteDnsRecord } = await import("./cloudflare");
      await expect(deleteDnsRecord("fail.example.com")).rejects.toThrow();
    });

    it("throws when multiple records found", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: [{ id: "record-1" }, { id: "record-2" }],
          }),
      });

      const { deleteDnsRecord } = await import("./cloudflare");
      await expect(deleteDnsRecord("multi.example.com")).rejects.toThrow();
    });

    it("handles deletion of already-deleted record gracefully", async () => {
      // Search returns a record
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: [{ id: "record-deleted" }],
          }),
      });
      // Deletion returns "record doesn't exist" error
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            errors: [{ code: 81044 }],
            result: null,
          }),
      });

      const { deleteDnsRecord } = await import("./cloudflare");
      const result = await deleteDnsRecord("already-deleted.example.com");
      expect(result).toBe(true);
    });
  });

  describe("api response parsing", () => {
    it("throws HttpError when response doesn't match schema", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve("not-an-object"),
      });

      const { addDnsRecord } = await import("./cloudflare");
      await expect(addDnsRecord("test.example.com")).rejects.toThrow("Something went wrong");
    });
  });
});
