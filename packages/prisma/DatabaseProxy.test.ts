import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabaseProxy, withDbContext, type DatabaseProxy, type ProxyConfig } from "./DatabaseProxy";

describe("DatabaseProxy", () => {
  let mockPrimary: any;
  let mockDefaultReplica: any;
  let mockTenantPrimary: any;
  let mockTenantReplica: any;
  let proxy: DatabaseProxy;

  beforeEach(() => {
    mockPrimary = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "primary" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 1 }) },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    };

    mockDefaultReplica = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "default-replica" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 2 }) },
    };

    mockTenantPrimary = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "tenant-primary" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 3 }) },
    };

    mockTenantReplica = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "tenant-replica" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 4 }) },
    };

    const config: ProxyConfig = {
      primary: mockPrimary,
      replicas: new Map([["read", mockDefaultReplica]]),
      tenants: new Map([
        [
          "acme",
          {
            primary: mockTenantPrimary,
            replicas: new Map([["read", mockTenantReplica]]),
          },
        ],
      ]),
    };

    proxy = createDatabaseProxy(config);
  });

  describe("when accessing primary database directly", () => {
    it("forwards model method calls to primary", async () => {
      const result = await proxy.user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("forwards different model calls to primary", async () => {
      const result = await proxy.booking.create({ data: {} } as any);

      expect(mockPrimary.booking.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it("forwards $connect to primary", () => {
      proxy.$connect();

      expect(mockPrimary.$connect).toHaveBeenCalled();
    });

    it("forwards $disconnect to primary", () => {
      proxy.$disconnect();

      expect(mockPrimary.$disconnect).toHaveBeenCalled();
    });
  });

  describe("when accessing default tenant replicas via .replica(name)", () => {
    it("routes to named replica from _default tenant config", async () => {
      const result = await proxy.replica("read").user.findMany();

      expect(mockDefaultReplica.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "default-replica" }]);
    });

    it("falls back to primary when replica not found", async () => {
      const result = await proxy.replica("nonexistent").user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary when replica name is null", async () => {
      const result = await proxy.replica(null).user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary when replica name is undefined", async () => {
      const result = await proxy.replica(undefined).user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary when replica name is empty string", async () => {
      const result = await proxy.replica("").user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("does not touch primary when using replica", async () => {
      await proxy.replica("read").user.findMany();

      expect(mockPrimary.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("when accessing tenants via .tenant(name)", () => {
    it("routes to tenant database", async () => {
      const result = await proxy.tenant("acme").user.findMany();

      expect(mockTenantPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-primary" }]);
    });

    it("falls back to primary when tenant not found", async () => {
      const result = await proxy.tenant("nonexistent").user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary when tenant name is undefined", async () => {
      const result = await proxy.tenant(undefined).user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary when tenant name is empty", async () => {
      const result = await proxy.tenant("").user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("does not touch primary when using tenant", async () => {
      await proxy.tenant("acme").user.findMany();

      expect(mockPrimary.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("when chaining .tenant().replica()", () => {
    it("routes to tenant-specific replica", async () => {
      const result = await proxy.tenant("acme").replica("read").user.findMany();

      expect(mockTenantReplica.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-replica" }]);
    });

    it("falls back to tenant primary when replica not found", async () => {
      const result = await proxy.tenant("acme").replica("nonexistent").user.findMany();

      expect(mockTenantPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-primary" }]);
    });

    it("does not use default replicas for tenant queries", async () => {
      await proxy.tenant("acme").replica("read").user.findMany();

      expect(mockDefaultReplica.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("when chaining multiple methods", () => {
    it("allows .tenant().tenant() returning same tenant", async () => {
      const result = await proxy.tenant("acme").tenant().user.findMany();

      expect(mockTenantPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-primary" }]);
    });

    it("returns DatabaseProxy from .tenant() with chaining methods", () => {
      const tenantProxy = proxy.tenant("acme");

      expect(typeof tenantProxy.replica).toBe("function");
      expect(typeof tenantProxy.tenant).toBe("function");
      expect(tenantProxy.user).toBeDefined();
    });

    it("returns plain PrismaClient from .replica() without chaining methods", () => {
      const replicaClient = proxy.replica("read");

      expect(replicaClient).toHaveProperty("user");
      expect(replicaClient).not.toHaveProperty("replica");
      expect(replicaClient).not.toHaveProperty("tenant");
    });
  });

  describe("when handling concurrent and sequential access", () => {
    it("isolates tenant calls from primary", async () => {
      await proxy.tenant("acme").user.findMany();
      await proxy.user.findMany();

      expect(mockTenantPrimary.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrimary.user.findMany).toHaveBeenCalledTimes(1);
    });

    it("isolates default replica calls from primary", async () => {
      await proxy.replica("read").user.findMany();
      await proxy.user.findMany();

      expect(mockDefaultReplica.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrimary.user.findMany).toHaveBeenCalledTimes(1);
    });

    it("handles parallel requests to different targets", async () => {
      const results = await Promise.all([
        proxy.user.findMany(),
        proxy.replica("read").user.findMany(),
        proxy.tenant("acme").user.findMany(),
        proxy.tenant("acme").replica("read").user.findMany(),
      ]);

      expect(results[0]).toEqual([{ id: 1, name: "primary" }]);
      expect(results[1]).toEqual([{ id: 1, name: "default-replica" }]);
      expect(results[2]).toEqual([{ id: 1, name: "tenant-primary" }]);
      expect(results[3]).toEqual([{ id: 1, name: "tenant-replica" }]);
    });
  });

  describe("when configuration is incomplete", () => {
    it("handles no default replicas gracefully", () => {
      const config: ProxyConfig = {
        primary: mockPrimary,
        replicas: new Map(),
        tenants: new Map(),
      };
      const proxyNoReplicas = createDatabaseProxy(config);

      expect(() => proxyNoReplicas.replica("any")).not.toThrow();
    });

    it("handles empty tenants map gracefully", () => {
      const config: ProxyConfig = {
        primary: mockPrimary,
        replicas: new Map([["read", mockDefaultReplica]]),
        tenants: new Map(),
      };
      const proxyNoTenants = createDatabaseProxy(config);

      expect(() => proxyNoTenants.tenant("any")).not.toThrow();
    });

    it("handles tenant with no replicas configured", async () => {
      const tenantNoReplicas = {
        user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "tenant-no-replicas" }]) },
      };

      const config: ProxyConfig = {
        primary: mockPrimary,
        replicas: new Map(),
        tenants: new Map([
          ["simple", { primary: tenantNoReplicas, replicas: new Map() }],
        ]),
      };

      const proxyTenantNoReplicas = createDatabaseProxy(config);
      const result = await proxyTenantNoReplicas.tenant("simple").replica("any").user.findMany();

      expect(tenantNoReplicas.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-no-replicas" }]);
    });
  });

  describe("when verifying proxy interface", () => {
    it("exposes PrismaClient models", () => {
      expect(proxy.user).toBeDefined();
      expect(proxy.booking).toBeDefined();
    });

    it("exposes PrismaClient special methods", () => {
      expect(proxy.$connect).toBeDefined();
      expect(proxy.$disconnect).toBeDefined();
    });

    it("exposes .replica() method", () => {
      expect(typeof proxy.replica).toBe("function");
    });

    it("exposes .tenant() method", () => {
      expect(typeof proxy.tenant).toBe("function");
    });
  });

  describe("when .replica() resolves from AsyncLocalStorage context", () => {
    it("resolves replica name from context when called without args", async () => {
      const result = await withDbContext({ replica: "read" }, async () => {
        return proxy.replica().user.findMany();
      });

      expect(mockDefaultReplica.user.findMany).toHaveBeenCalled();
      expect(mockPrimary.user.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "default-replica" }]);
    });

    it("explicit arg overrides context", async () => {
      const result = await withDbContext({ replica: "nonexistent" }, async () => {
        return proxy.replica("read").user.findMany();
      });

      expect(mockDefaultReplica.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "default-replica" }]);
    });

    it("falls back to primary when context replica not found", async () => {
      const result = await withDbContext({ replica: "nonexistent" }, async () => {
        return proxy.replica().user.findMany();
      });

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary outside of any context", async () => {
      const result = await proxy.replica().user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("does not affect direct prisma access (always primary)", async () => {
      const result = await withDbContext({ replica: "read" }, async () => {
        return proxy.user.findMany();
      });

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });
  });

  describe("when .tenant() resolves from AsyncLocalStorage context", () => {
    it("resolves tenant name from context when called without args", async () => {
      const result = await withDbContext({ tenant: "acme" }, async () => {
        return proxy.tenant().user.findMany();
      });

      expect(mockTenantPrimary.user.findMany).toHaveBeenCalled();
      expect(mockPrimary.user.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-primary" }]);
    });

    it("resolves tenant + replica from context", async () => {
      const result = await withDbContext({ tenant: "acme", replica: "read" }, async () => {
        return proxy.tenant().replica().user.findMany();
      });

      expect(mockTenantReplica.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-replica" }]);
    });

    it("explicit arg overrides context", async () => {
      const result = await withDbContext({ tenant: "nonexistent" }, async () => {
        return proxy.tenant("acme").user.findMany();
      });

      expect(mockTenantPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-primary" }]);
    });

    it("tenant from context with explicit replica arg", async () => {
      const result = await withDbContext({ tenant: "acme" }, async () => {
        return proxy.tenant().replica("read").user.findMany();
      });

      expect(mockTenantReplica.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "tenant-replica" }]);
    });

    it("falls back to primary when context tenant not found", async () => {
      const result = await withDbContext({ tenant: "nonexistent" }, async () => {
        return proxy.tenant().user.findMany();
      });

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("falls back to primary outside of any context", async () => {
      const result = await proxy.tenant().user.findMany();

      expect(mockPrimary.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "primary" }]);
    });

    it("isolates concurrent contexts", async () => {
      const [r1, r2, r3] = await Promise.all([
        withDbContext({ replica: "read" }, () => proxy.replica().user.findMany()),
        withDbContext({ tenant: "acme" }, () => proxy.tenant().user.findMany()),
        proxy.user.findMany(),
      ]);

      expect(r1).toEqual([{ id: 1, name: "default-replica" }]);
      expect(r2).toEqual([{ id: 1, name: "tenant-primary" }]);
      expect(r3).toEqual([{ id: 1, name: "primary" }]);
    });
  });
});

