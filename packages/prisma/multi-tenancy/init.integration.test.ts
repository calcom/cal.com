import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mockCustomPrisma = vi.fn();

vi.mock("../index", () => ({
  customPrisma: (...args: unknown[]) => mockCustomPrisma(...args),
}));

describe("MultiTenancy integration", () => {
  let server: http.Server;
  let port: number;

  let initMultiTenancy: typeof import("./init").initMultiTenancy;
  let getTenant: typeof import("./init").getTenant;
  let tenantContext: typeof import("./context").tenantContext;

  const defaultClient = { _tag: "default" };
  const euClient = { _tag: "eu" };
  const brClient = { _tag: "br" };

  function request(headers?: Record<string, string>): Promise<{ tenant: string | undefined; clientTag: string }> {
    return new Promise((resolve, reject) => {
      const req = http.get({ hostname: "127.0.0.1", port, headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(JSON.parse(body)));
      });
      req.on("error", reject);
    });
  }

  beforeAll(async () => {
    process.env.DATABASE_TENANTS = JSON.stringify({
      eu: "postgresql://eu-host/db",
      br: "postgresql://br-host/db",
    });

    mockCustomPrisma.mockImplementation((opts: { datasources: { db: { url: string } } }) => {
      if (opts.datasources.db.url.includes("eu")) return euClient;
      if (opts.datasources.db.url.includes("br")) return brClient;
      return defaultClient;
    });

    const mod = await import("./init");
    const ctx = await import("./context");
    initMultiTenancy = mod.initMultiTenancy;
    getTenant = mod.getTenant;
    tenantContext = ctx.tenantContext;

    initMultiTenancy();

    await new Promise<void>((resolve) => {
      server = http.createServer((_req, res) => {
        const tenant = getTenant();
        const client = tenantContext.resolve(defaultClient as never);

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          tenant,
          clientTag: (client as { _tag: string })._tag,
        }));
      });
      server.listen(0, () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    server?.close();
    delete process.env.DATABASE_TENANTS;
  });

  it("routes to EU client when X-DB-Tenant: eu", async () => {
    const result = await request({ "x-db-tenant": "eu" });
    expect(result).toEqual({ tenant: "eu", clientTag: "eu" });
  });

  it("routes to BR client when X-DB-Tenant: br", async () => {
    const result = await request({ "x-db-tenant": "br" });
    expect(result).toEqual({ tenant: "br", clientTag: "br" });
  });

  it("falls back to default client without header", async () => {
    const result = await request();
    expect(result).toEqual({ tenant: undefined, clientTag: "default" });
  });

  it("falls back to default client for unknown tenant", async () => {
    const result = await request({ "x-db-tenant": "jp" });
    expect(result).toEqual({ tenant: "jp", clientTag: "default" });
  });

  it("isolates concurrent requests with different tenants", async () => {
    const [eu, br, def] = await Promise.all([
      request({ "x-db-tenant": "eu" }),
      request({ "x-db-tenant": "br" }),
      request(),
    ]);

    expect(eu).toEqual({ tenant: "eu", clientTag: "eu" });
    expect(br).toEqual({ tenant: "br", clientTag: "br" });
    expect(def).toEqual({ tenant: undefined, clientTag: "default" });
  });
});
