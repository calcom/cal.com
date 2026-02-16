import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveReplica } from "@calcom/lib/server/resolveReplica";

import { createDatabaseProxy, type DatabaseProxy, type ProxyConfig } from "./DatabaseProxy";

describe("DatabaseProxy", () => {
  let mockPrimary: any;
  let mockReplica1: any;
  let mockReplica2: any;
  let mockTenantPrimary: any;
  let mockTenantReplica: any;
  let proxy: DatabaseProxy;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrimary = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "primary" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 1 }) },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    };

    mockReplica1 = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "replica1" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 2 }) },
    };

    mockReplica2 = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "replica2" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 3 }) },
    };

    mockTenantPrimary = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "tenant-primary" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 4 }) },
    };

    mockTenantReplica = {
      user: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "tenant-replica" }]) },
      booking: { create: vi.fn().mockResolvedValue({ id: 5 }) },
    };

    const config: ProxyConfig = {
      primary: mockPrimary,
      replicas: new Map([
        ["read", mockReplica1],
        ["us-east", mockReplica2],
      ]),
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

  describe("when accessing read replicas via .replica(name)", () => {
    it("routes to named replica", async () => {
      const result = await proxy.replica("read").user.findMany();

      expect(mockReplica1.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "replica1" }]);
    });

    it("routes to different replica by name", async () => {
      const result = await proxy.replica("us-east").user.findMany();

      expect(mockReplica2.user.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: "replica2" }]);
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

    it("does not use global replicas for tenant queries", async () => {
      await proxy.tenant("acme").replica("read").user.findMany();

      expect(mockReplica1.user.findMany).not.toHaveBeenCalled();
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

    it("isolates replica calls from primary", async () => {
      await proxy.replica("read").user.findMany();
      await proxy.user.findMany();

      expect(mockReplica1.user.findMany).toHaveBeenCalledTimes(1);
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
      expect(results[1]).toEqual([{ id: 1, name: "replica1" }]);
      expect(results[2]).toEqual([{ id: 1, name: "tenant-primary" }]);
      expect(results[3]).toEqual([{ id: 1, name: "tenant-replica" }]);
    });
  });

  describe("when configuration is incomplete", () => {
    it("handles empty replicas map gracefully", () => {
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
        replicas: new Map([["read", mockReplica1]]),
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

});

describe("resolveReplica", () => {
  it("returns the header value when present", () => {
    const headers = new Headers({ "x-cal-replica": "read" });

    expect(resolveReplica(headers)).toBe("read");
  });

  it("returns null when header is absent", () => {
    const headers = new Headers();

    expect(resolveReplica(headers)).toBeNull();
  });

  it("returns empty string when header is set to empty", () => {
    const headers = new Headers({ "x-cal-replica": "" });

    expect(resolveReplica(headers)).toBe("");
  });

  it("returns the value for any replica name", () => {
    const headers = new Headers({ "x-cal-replica": "us-east" });

    expect(resolveReplica(headers)).toBe("us-east");
  });

  it("is case-insensitive for header name", () => {
    const headers = new Headers({ "X-Cal-Replica": "read" });

    expect(resolveReplica(headers)).toBe("read");
  });
});
