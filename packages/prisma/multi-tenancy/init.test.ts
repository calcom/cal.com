import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockTenantClientFactory = vi.fn();

describe("MultiTenancy", () => {
  let initMultiTenancy: typeof import("./init").initMultiTenancy;
  let getTenant: typeof import("./init").getTenant;
  let setTenantClientFactory: typeof import("./init").setTenantClientFactory;
  let tenantStorage: typeof import("./init").tenantStorage;
  let tenantContext: typeof import("./context").tenantContext;

  beforeEach(async () => {
    vi.resetModules();
    mockTenantClientFactory.mockReset();

    const mod = await import("./init");
    const ctx = await import("./context");
    initMultiTenancy = mod.initMultiTenancy;
    getTenant = mod.getTenant;
    setTenantClientFactory = mod.setTenantClientFactory;
    tenantStorage = mod.tenantStorage;
    tenantContext = ctx.tenantContext;
  });

  afterEach(() => {
    delete process.env.DATABASE_TENANTS;
  });

  describe("getTenant", () => {
    it("returns undefined outside of a request context", () => {
      expect(getTenant()).toBeUndefined();
    });

    it("returns the tenant inside a storage context", () => {
      tenantStorage.run({ tenant: "eu" }, () => {
        expect(getTenant()).toBe("eu");
      });
    });
  });

  describe("resolveClient (via tenantContext)", () => {
    const defaultClient = { _tag: "default" } as never;

    it("returns default client before init", () => {
      expect(tenantContext.resolve(defaultClient)).toBe(defaultClient);
    });

    it("returns default client when no tenant context is active", () => {
      initMultiTenancy();
      expect(tenantContext.resolve(defaultClient)).toBe(defaultClient);
    });

    it("returns default client when tenant is not in DATABASE_TENANTS", () => {
      process.env.DATABASE_TENANTS = JSON.stringify({ eu: "postgresql://eu-host/db" });
      setTenantClientFactory(mockTenantClientFactory);
      initMultiTenancy();

      tenantStorage.run({ tenant: "br" }, () => {
        expect(tenantContext.resolve(defaultClient)).toBe(defaultClient);
      });
    });

    it("returns tenant client when tenant exists in DATABASE_TENANTS", () => {
      const tenantClient = { _tag: "eu" } as never;
      mockTenantClientFactory.mockReturnValue(tenantClient);
      process.env.DATABASE_TENANTS = JSON.stringify({ eu: "postgresql://eu-host/db" });
      setTenantClientFactory(mockTenantClientFactory);
      initMultiTenancy();

      tenantStorage.run({ tenant: "eu" }, () => {
        expect(tenantContext.resolve(defaultClient)).toBe(tenantClient);
        expect(mockTenantClientFactory).toHaveBeenCalledWith("postgresql://eu-host/db");
      });
    });

    it("caches tenant client across calls", () => {
      const tenantClient = { _tag: "eu" } as never;
      mockTenantClientFactory.mockReturnValue(tenantClient);
      process.env.DATABASE_TENANTS = JSON.stringify({ eu: "postgresql://eu-host/db" });
      setTenantClientFactory(mockTenantClientFactory);
      initMultiTenancy();

      tenantStorage.run({ tenant: "eu" }, () => {
        tenantContext.resolve(defaultClient);
        tenantContext.resolve(defaultClient);
        expect(mockTenantClientFactory).toHaveBeenCalledTimes(1);
      });
    });

    it("handles invalid JSON in DATABASE_TENANTS gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.DATABASE_TENANTS = "not-json";
      setTenantClientFactory(mockTenantClientFactory);
      initMultiTenancy();

      tenantStorage.run({ tenant: "eu" }, () => {
        expect(tenantContext.resolve(defaultClient)).toBe(defaultClient);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[MultiTenancy] DATABASE_TENANTS is not valid JSON, ignoring"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("initMultiTenancy (HTTP patching)", () => {
    let server: http.Server;

    afterEach(() => {
      server?.close();
    });

    it("sets tenant context from X-DB-Tenant header", async () => {
      initMultiTenancy();

      const capturedTenant = await new Promise<string | undefined>((resolve) => {
        server = http.createServer((_req, res) => {
          resolve(getTenant());
          res.end();
        });
        server.listen(0, () => {
          const port = (server.address() as { port: number }).port;
          http.get({ hostname: "127.0.0.1", port, headers: { "x-db-tenant": "eu" } });
        });
      });

      expect(capturedTenant).toBe("eu");
    });

    it("does not set tenant context when header is absent", async () => {
      initMultiTenancy();

      const capturedTenant = await new Promise<string | undefined>((resolve) => {
        server = http.createServer((_req, res) => {
          resolve(getTenant());
          res.end();
        });
        server.listen(0, () => {
          const port = (server.address() as { port: number }).port;
          http.get({ hostname: "127.0.0.1", port });
        });
      });

      expect(capturedTenant).toBeUndefined();
    });
  });
});
