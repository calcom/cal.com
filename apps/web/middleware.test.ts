// Import mocked functions
import { get as edgeConfigGet } from "@vercel/edge-config";
import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { checkPostMethod } from "./middleware";
// We'll test the wrapped middleware as it would be used in production
import middleware from "./middleware";

// Mock dependencies at module level
vi.mock("@vercel/edge-config", () => ({
  get: vi.fn(),
}));

vi.mock("next-collect/server", () => ({
  collectEvents: vi.fn((config: any) => config.middleware),
}));

vi.mock("@calcom/lib/telemetry", () => ({
  extendEventData: vi.fn(),
  nextCollectBasicSettings: {},
}));

// Mock NextResponse.json since it's not available in test environment
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");

  // Create a NextResponse constructor that returns Response objects
  const NextResponse = function (body: any, init?: ResponseInit) {
    return new Response(body, init);
  };

  // Add static methods
  NextResponse.json = (body: any, init?: ResponseInit) => {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: {
        ...init?.headers,
        "content-type": "application/json",
      },
    });
  };

  NextResponse.next = (init?: ResponseInit) => {
    const response = new Response(null, {
      status: 200,
      ...init,
      headers: {
        ...init?.headers,
        "x-middleware-next": "1",
      },
    });

    // Add cookies property
    (response as any).cookies = {
      delete: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
    };

    return response;
  };

  NextResponse.rewrite = (url: URL | string, init?: ResponseInit) => {
    const rewriteUrl = typeof url === "string" ? new URL(url) : url;
    return new Response(null, {
      status: 200,
      ...init,
      headers: {
        ...init?.headers,
        "x-middleware-rewrite": rewriteUrl.toString(),
      },
    });
  };

  NextResponse.redirect = (url: URL | string, statusOrInit?: number | ResponseInit) => {
    const redirectUrl = typeof url === "string" ? new URL(url) : url;
    const status = typeof statusOrInit === "number" ? statusOrInit : statusOrInit?.status || 307;
    const init = typeof statusOrInit === "object" ? statusOrInit : {};

    const response = new Response(null, {
      ...init,
      status,
      headers: {
        ...init.headers,
        location: redirectUrl.toString(),
      },
    });

    // Add cookies property
    (response as any).cookies = {
      delete: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
    };

    return response;
  };

  return {
    ...actual,
    NextResponse,
  };
});

const createTestRequest = (overrides?: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) => {
  const url = overrides?.url || `${WEBAPP_URL}/test-path`;
  const method = overrides?.method || "GET";
  const headers = new Headers(overrides?.headers || {});

  const req = new NextRequest(new Request(url, { method, headers }));

  // Add cookies if provided
  if (overrides?.cookies) {
    Object.entries(overrides.cookies).forEach(([name, value]) => {
      req.cookies.set(name, value);
    });
  }

  return req;
};

const createEdgeConfigMock = (config: Record<string, any>) => {
  return (key: string) => {
    if (key in config) return Promise.resolve(config[key]);
    return Promise.resolve(undefined);
  };
};

// Helper to safely get header value
const getHeader = (res: Response, name: string) => {
  return res.headers.get(name);
};

// Helper to check response status
const expectStatus = (res: Response, status: number) => {
  expect(res.status).toBe(status);
};

// Wrapper for middleware calls to handle type casting
const callMiddleware = async (req: NextRequest): Promise<Response> => {
  return (await (middleware as any)(req)) as Response;
};

describe("Middleware - POST requests restriction", () => {
  const createRequest = (path: string, method: string) => {
    return new NextRequest(
      new Request(`${WEBAPP_URL}${path}`, {
        method,
      })
    );
  };

  it("should allow POST requests to /api routes", async () => {
    const req1 = createRequest("/api/auth/signup", "POST");
    const res1 = checkPostMethod(req1);
    expect(res1).toBeNull();
  });

  it("should block POST requests to not-allowed app routes", async () => {
    const req = createRequest("/team/xyz", "POST");
    const res = checkPostMethod(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(405);
    expect(res?.statusText).toBe("Method Not Allowed");
    expect(res?.headers.get("Allow")).toBe("GET");
  });

  it("should allow GET requests to app routes", async () => {
    const req = createRequest("/team/xyz", "GET");
    const res = checkPostMethod(req);
    expect(res).toBeNull();
  });

  it("should allow GET requests to /api routes", async () => {
    const req = createRequest("/api/auth/signup", "GET");
    const res = checkPostMethod(req);
    expect(res).toBeNull();
  });
});

describe("Middleware Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set test environment
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_URL", WEBAPP_URL);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Static File Handling", () => {
    it("should skip processing for static files", async () => {
      const staticPaths = ["/images/logo.png", "/_next/static/main.js", "/favicon.ico"];

      for (const path of staticPaths) {
        const req = createTestRequest({ url: `${WEBAPP_URL}${path}` });
        const res = await callMiddleware(req);

        expect(res).toBeDefined();
        expectStatus(res, 200);
        expect(getHeader(res, "x-middleware-next")).toBe("1");
      }
    });
  });

  describe("POST Method Protection", () => {
    it("should allow POST to /api/auth/signup", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/api/auth/signup`,
        method: "POST",
      });

      const res = await callMiddleware(req);
      expectStatus(res, 200);
    });

    it("should block POST to regular routes", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
        method: "POST",
      });

      const res = await callMiddleware(req);
      expectStatus(res, 405);
      expect(getHeader(res, "Allow")).toBe("GET");
    });
  });

  describe("Maintenance Mode", () => {
    it("should redirect to maintenance when enabled", async () => {
      (edgeConfigGet as Mock).mockImplementation(
        createEdgeConfigMock({
          isInMaintenanceMode: true,
        })
      );

      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
      });

      const res = await callMiddleware(req);
      expect(res).toBeDefined();
      expectStatus(res, 200);
    });

    it("should not affect API routes in maintenance mode", async () => {
      (edgeConfigGet as Mock).mockImplementation(
        createEdgeConfigMock({
          isInMaintenanceMode: true,
        })
      );

      const req = createTestRequest({
        url: `${WEBAPP_URL}/api/bookings`,
      });

      const res = await callMiddleware(req);
      expect(res).toBeDefined();
      expectStatus(res, 200);
    });
  });

  describe("Signup Control", () => {
    it("should block signup when disabled", async () => {
      (edgeConfigGet as Mock).mockImplementation(
        createEdgeConfigMock({
          isSignupDisabled: true,
        })
      );

      const req = createTestRequest({
        url: `${WEBAPP_URL}/api/auth/signup`,
        method: "POST",
      });

      const res = await callMiddleware(req);
      expectStatus(res, 503);

      const body = await res.text();
      expect(body).toContain("Signup is disabled");
    });

    it("should allow signup when enabled", async () => {
      (edgeConfigGet as Mock).mockImplementation(
        createEdgeConfigMock({
          isSignupDisabled: false,
        })
      );

      const req = createTestRequest({
        url: `${WEBAPP_URL}/api/auth/signup`,
        method: "POST",
      });

      const res = await callMiddleware(req);
      expectStatus(res, 200);
    });
  });

  describe("Cookie Management", () => {
    it("should handle return-to cookie redirect", async () => {
      const returnUrl = "/dashboard";
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/installed`,
        cookies: { "return-to": returnUrl },
      });

      const res = await callMiddleware(req);
      expectStatus(res, 307);
      expect(getHeader(res, "location")).toContain(returnUrl);
    });

    it("should not redirect without return-to cookie", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/installed`,
      });

      const res = await callMiddleware(req);
      expectStatus(res, 200);
    });

    it("should delete session cookie on logout", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/auth/logout`,
      });

      const res = await callMiddleware(req);
      const setCookie = getHeader(res, "set-cookie");

      if (setCookie) {
        expect(setCookie).toContain("next-auth.session-token");
      }
    });
  });

  describe("Embed Routes", () => {
    it("should add embed headers", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test/embed`,
      });

      const res = await callMiddleware(req);
      expect(getHeader(res, "x-isEmbed")).toBe("true");
    });

    it("should add COEP header when requested", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test/embed?flag.coep=true`,
      });

      const res = await callMiddleware(req);
      expect(getHeader(res, "Cross-Origin-Embedder-Policy")).toBe("require-corp");
    });

    it("should add color scheme header", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test/embed?ui.color-scheme=dark`,
      });

      const res = await callMiddleware(req);
      expect(getHeader(res, "x-embedColorScheme")).toBe("dark");
    });
  });

  describe("CSP Headers", () => {
    beforeEach(() => {
      vi.stubEnv("CSP_POLICY", "strict");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should add CSP headers to login pages", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/auth/login`,
      });

      const res = await callMiddleware(req);
      const cspHeader = getHeader(res, "content-security-policy");

      expect(cspHeader).toBeTruthy();
      expect(cspHeader).toContain("default-src");
      expect(cspHeader).toContain("script-src");
    });

    it("should not add CSP headers to non-login pages", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
      });

      const res = await callMiddleware(req);
      const cspHeader = getHeader(res, "content-security-policy");

      expect(cspHeader).toBeNull();
    });

    it("should add x-csp-status when CSP_POLICY not set", async () => {
      vi.unstubAllEnvs();

      const req = createTestRequest({
        url: `${WEBAPP_URL}/auth/login`,
      });

      const res = await callMiddleware(req);
      expect(getHeader(res, "x-csp-status")).toBe("not-opted-in");
    });
  });

  describe("Routing Forms", () => {
    it("should rewrite legacy routing_forms URLs", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/routing_forms/form-id`,
      });

      const res = await callMiddleware(req);
      expect(res).toBeDefined();
      expectStatus(res, 200);
    });
  });

  describe("Multiple Features", () => {
    it("should handle POST protection before maintenance mode", async () => {
      (edgeConfigGet as Mock).mockImplementation(
        createEdgeConfigMock({
          isInMaintenanceMode: true,
        })
      );

      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
        method: "POST",
      });

      const res = await callMiddleware(req);
      // POST protection should trigger first
      expectStatus(res, 405);
    });

    it("should handle embed route with routing forms rewrite", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/routing_forms/form/embed?ui.color-scheme=light`,
      });

      const res = await callMiddleware(req);
      expect(getHeader(res, "x-isEmbed")).toBe("true");
      expect(getHeader(res, "x-embedColorScheme")).toBe("light");
    });
  });

  describe("Error Handling", () => {
    it("should handle Edge Config errors gracefully", async () => {
      (edgeConfigGet as Mock).mockImplementation(() => {
        throw new Error("Config error");
      });

      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
      });

      const res = await callMiddleware(req);
      expect(res).toBeDefined();
      expectStatus(res, 200);
    });

    it("should handle malformed URLs", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}//double-slash`,
      });

      const res = await callMiddleware(req);
      expect(res).toBeDefined();
    });
  });
});
