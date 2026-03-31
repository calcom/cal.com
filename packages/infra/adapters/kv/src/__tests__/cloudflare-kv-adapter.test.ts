import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CloudflareKVAdapter } from "../cloudflare-kv-adapter";

const MOCK_CONFIG = {
  accountId: "test-account-id",
  namespaceId: "test-namespace-id",
  apiToken: "test-api-token",
};
const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${MOCK_CONFIG.accountId}/storage/kv/namespaces/${MOCK_CONFIG.namespaceId}/values`;

describe("CloudflareKVAdapter", () => {
  let adapter: CloudflareKVAdapter;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    adapter = new CloudflareKVAdapter(MOCK_CONFIG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("get", () => {
    test("returns text on 200", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('{"region":"eu"}', { status: 200 }));

      const result = await adapter.get("slug:john");

      expect(result).toBe('{"region":"eu"}');
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/slug%3Ajohn`,
        expect.objectContaining({
          method: "GET",
          headers: { Authorization: `Bearer ${MOCK_CONFIG.apiToken}` },
        })
      );
    });

    test("returns null on 404", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));

      const result = await adapter.get("slug:john");

      expect(result).toBeNull();
    });

    test("throws on non-200/404 status", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

      await expect(adapter.get("slug:john")).rejects.toThrow("Cloudflare KV GET failed: 500");
    });
  });

  describe("put", () => {
    test("sends PUT with correct body and headers", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));

      await adapter.put("slug:john", '{"region":"us"}');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/slug%3Ajohn`,
        expect.objectContaining({
          method: "PUT",
          headers: {
            Authorization: `Bearer ${MOCK_CONFIG.apiToken}`,
            "Content-Type": "text/plain",
          },
          body: '{"region":"us"}',
        })
      );
    });

    test("appends expiration_ttl query param when ttlSeconds is provided", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));

      await adapter.put("slug:john", '{"region":"us"}', 3600);

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/slug%3Ajohn?expiration_ttl=3600`,
        expect.objectContaining({
          method: "PUT",
          body: '{"region":"us"}',
        })
      );
    });

    test("omits expiration_ttl when ttlSeconds is undefined", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));

      await adapter.put("slug:john", "value");

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/slug%3Ajohn`,
        expect.objectContaining({ method: "PUT" })
      );
    });

    test("throws on non-ok status", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("Forbidden", { status: 403 }));

      await expect(adapter.put("slug:john", "value")).rejects.toThrow("Cloudflare KV PUT failed: 403");
    });
  });

  describe("delete", () => {
    test("sends DELETE with correct URL", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));

      await adapter.delete("slug:john");

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/slug%3Ajohn`,
        expect.objectContaining({
          method: "DELETE",
          headers: { Authorization: `Bearer ${MOCK_CONFIG.apiToken}` },
        })
      );
    });

    test("throws on non-ok status", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));

      await expect(adapter.delete("slug:john")).rejects.toThrow("Cloudflare KV DELETE failed: 404");
    });
  });
});
