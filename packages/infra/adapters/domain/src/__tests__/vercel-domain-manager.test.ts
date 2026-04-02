import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DomainAdapterError } from "../lib/domain-adapter-error";
import { VercelDomainManager } from "../vercel-domain-manager";

const MOCK_CONFIG = {
  projectId: "prj_test123",
  teamId: "team_test456",
  authToken: "test-auth-token",
};

const BASE_URL = "https://api.vercel.com";

describe("VercelDomainManager", () => {
  let manager: VercelDomainManager;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    manager = new VercelDomainManager(MOCK_CONFIG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("register", () => {
    test("returns success on successful creation", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      const result = await manager.register("example.com");

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/v9/projects/${MOCK_CONFIG.projectId}/domains?teamId=${MOCK_CONFIG.teamId}`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${MOCK_CONFIG.authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "example.com" }),
        })
      );
    });

    test("normalizes domain to lowercase", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      await manager.register("Example.COM");

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ name: "example.com" }),
        })
      );
    });

    test("throws DomainAdapterError on domain_already_in_use", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: "domain_already_in_use", message: "Already in use" } }),
          { status: 409 }
        )
      );

      const err = await manager.register("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({
        code: "domain_already_in_use",
        message: "Domain is already registered on this project",
      });
    });

    test("throws DomainAdapterError on domain_taken error", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "domain_taken", message: "Domain taken" } }), {
          status: 400,
        })
      );

      const err = await manager.register("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({
        code: "domain_taken",
        message: "Domain is already used by a different project",
      });
    });

    test("throws DomainAdapterError on forbidden error", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "forbidden", message: "Forbidden" } }), { status: 403 })
      );

      const err = await manager.register("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({ code: "forbidden" });
    });

    test("returns failure on unparseable response", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

      const result = await manager.register("example.com");

      expect(result).toEqual({ success: false });
    });
  });

  describe("unregister", () => {
    test("returns true on successful deletion", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      const result = await manager.unregister("example.com");

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/v9/projects/${MOCK_CONFIG.projectId}/domains/example.com?teamId=${MOCK_CONFIG.teamId}`,
        expect.objectContaining({
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${MOCK_CONFIG.authToken}`,
            "Content-Type": "application/json",
          },
        })
      );
    });

    test("returns true when domain not found", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "not_found", message: "Not found" } }), { status: 404 })
      );

      const result = await manager.unregister("example.com");

      expect(result).toBe(true);
    });

    test("throws DomainAdapterError on forbidden error", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "forbidden", message: "Forbidden" } }), { status: 403 })
      );

      const err = await manager.unregister("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({ code: "forbidden" });
    });

    test("returns false on unparseable response", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

      const result = await manager.unregister("example.com");

      expect(result).toBe(false);
    });
  });

  describe("getDomainInfo", () => {
    test("returns normalized domain info for verified domain", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: "example.com", apexName: "example.com", verified: true }), {
          status: 200,
        })
      );

      const result = await manager.getDomainInfo("example.com");

      expect(result).toEqual({ verified: true });
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/v9/projects/${MOCK_CONFIG.projectId}/domains/example.com?teamId=${MOCK_CONFIG.teamId}`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("returns null when domain not found", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "not_found", message: "Domain not found" } }), {
          status: 404,
        })
      );

      const result = await manager.getDomainInfo("example.com");

      expect(result).toBeNull();
    });

    test("throws DomainAdapterError on unexpected error", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "forbidden", message: "Access denied" } }), {
          status: 403,
        })
      );

      const err = await manager.getDomainInfo("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({ code: "provider_error", message: "Access denied" });
    });

    test("returns pending records when present", async () => {
      const verification = [
        { type: "TXT", domain: "_vercel.example.com", value: "vc-abc123", reason: "pending" },
      ];
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: "example.com", verified: false, verification }), { status: 200 })
      );

      const result = await manager.getDomainInfo("example.com");

      expect(result).toEqual({ verified: false, pendingRecords: verification });
    });

    test("defaults verified to false when not present", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: "example.com" }), { status: 200 })
      );

      const result = await manager.getDomainInfo("example.com");

      expect(result).toEqual({ verified: false });
    });
  });

  describe("getConfigStatus", () => {
    test("returns configured true when not misconfigured", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ misconfigured: false }), { status: 200 })
      );

      const result = await manager.getConfigStatus("example.com");

      expect(result).toEqual({ configured: true });
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/v6/domains/example.com/config?teamId=${MOCK_CONFIG.teamId}`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("returns configured false with conflicts", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            misconfigured: true,
            conflicts: [{ name: "example.com", type: "A", value: "1.2.3.4" }],
          }),
          { status: 200 }
        )
      );

      const result = await manager.getConfigStatus("example.com");

      expect(result).toEqual({
        configured: false,
        conflicts: [{ name: "example.com", type: "A", value: "1.2.3.4" }],
      });
    });

    test("throws DomainAdapterError on error response", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "forbidden", message: "Access denied" } }), {
          status: 403,
        })
      );

      const err = await manager.getConfigStatus("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({ code: "config_error", message: "Access denied" });
    });
  });

  describe("triggerVerification", () => {
    test("returns verified true on successful verification", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: "example.com", verified: true }), { status: 200 })
      );

      const result = await manager.triggerVerification("example.com");

      expect(result).toEqual({ verified: true });
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/v9/projects/${MOCK_CONFIG.projectId}/domains/example.com/verify?teamId=${MOCK_CONFIG.teamId}`,
        expect.objectContaining({ method: "POST" })
      );
    });

    test("returns pending records when verification incomplete", async () => {
      const verification = [
        { type: "TXT", domain: "_vercel.example.com", value: "vc-abc123", reason: "pending" },
      ];
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: "example.com", verified: false, verification }), { status: 200 })
      );

      const result = await manager.triggerVerification("example.com");

      expect(result).toEqual({ verified: false, pendingRecords: verification });
    });

    test("throws DomainAdapterError on error response", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "forbidden", message: "Access denied" } }), {
          status: 403,
        })
      );

      const err = await manager.triggerVerification("example.com").catch((e) => e);
      expect(err).toBeInstanceOf(DomainAdapterError);
      expect(err).toMatchObject({ code: "verification_error", message: "Access denied" });
    });
  });

  describe("getDnsConfig", () => {
    test("returns Vercel DNS configuration", () => {
      const config = manager.getDnsConfig();

      expect(config).toEqual({
        aRecordIp: "76.76.21.21",
        cnameTarget: "cname.vercel-dns.com",
        defaultTtl: 86400,
      });
    });
  });

  describe("without teamId", () => {
    test("omits teamId from URL when not configured", async () => {
      const managerNoTeam = new VercelDomainManager({
        projectId: "prj_test123",
        authToken: "test-auth-token",
      });
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      await managerNoTeam.register("example.com");

      expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/v9/projects/prj_test123/domains`, expect.any(Object));
    });
  });
});
