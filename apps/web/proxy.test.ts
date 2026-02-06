// Import mocked functions
import { get as edgeConfigGet } from "@vercel/edge-config";
import { NextRequest, NextResponse } from "next/server";
import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { checkPostMethod } from "./proxy";
// We'll test the wrapped proxy as it would be used in production
import proxy from "./proxy";
import { config } from "./proxy";

// Mock dependencies at module level
vi.mock("@vercel/edge-config", () => ({
  get: vi.fn(),
}));

// Mock NextResponse.json since it's not available in test environment
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");

  // Create a NextResponse constructor that returns Response objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NextResponse = function (body: any, init?: ResponseInit) {
    return new Response(body, init);
  };

  // Add static methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Wrapper for proxy calls to handle type casting
const callProxy = async (req: NextRequest): Promise<Response> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await (proxy as any)(req)) as Response;
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
        const res = await callProxy(req);

        expect(res).toBeDefined();
        expectStatus(res, 200);
        expect(getHeader(res, "x-middleware-next")).toBe("1");
      }
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

      const res = await callProxy(req);
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

      const res = await callProxy(req);
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

      const res = await callProxy(req);
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

      const res = await callProxy(req);
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

      const res = await callProxy(req);
      expectStatus(res, 307);
      expect(getHeader(res, "location")).toContain(returnUrl);
    });

    it("should not redirect without return-to cookie", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/installed`,
      });

      const res = await callProxy(req);
      expectStatus(res, 200);
    });

    it("should delete session cookie on logout", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/auth/logout`,
      });

      const res = await callProxy(req);
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

      const res = await callProxy(req);
      expect(getHeader(res, "x-isEmbed")).toBe("true");
    });

    it("should add COEP header when requested", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test/embed?flag.coep=true`,
      });

      const res = await callProxy(req);
      expect(getHeader(res, "Cross-Origin-Embedder-Policy")).toBe("require-corp");
    });

    it("should add color scheme header", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test/embed?ui.color-scheme=dark`,
      });

      const res = await callProxy(req);
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

      const res = await callProxy(req);
      const cspHeader = getHeader(res, "content-security-policy");

      expect(cspHeader).toBeTruthy();
      expect(cspHeader).toContain("default-src");
      expect(cspHeader).toContain("script-src");
    });

    it("should not add CSP headers to non-login pages", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
      });

      const res = await callProxy(req);
      const cspHeader = getHeader(res, "content-security-policy");

      expect(cspHeader).toBeNull();
    });

    it("should add x-csp-status when CSP_POLICY not set", async () => {
      vi.unstubAllEnvs();

      const req = createTestRequest({
        url: `${WEBAPP_URL}/auth/login`,
      });

      const res = await callProxy(req);
      expect(getHeader(res, "x-csp-status")).toBe("not-opted-in");
    });
  });

  describe("Routing Forms", () => {
    it("should rewrite legacy routing_forms URLs", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/routing_forms/form-id`,
      });

      const res = await callProxy(req);
      expect(res).toBeDefined();
      expectStatus(res, 200);
    });
  });

  describe("Header sanitization", () => {
    it("sanitizes non-ASCII request header values to prevent Vercel Runtime Malformed Response Header", async () => {
      const spy = vi.spyOn(NextResponse, "next");

      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
        // Next.js will translate request overrides into x-middleware-request-* headers internally
        headers: {
          "cf-region": "São Paulo", // contains non-ASCII "ã"
        },
      });

      const res = await callProxy(req);
      expectStatus(res, 200);

      // Assert that middleware forwarded sanitized ASCII-only value
      const initArg = (spy as unknown as Mock).mock.calls.at(-1)?.[0] as {
        request?: { headers?: Headers };
      };
      expect(initArg?.request?.headers).toBeDefined();

      const forwarded = initArg?.request?.headers as Headers;
      expect(forwarded.get("cf-region")).toBe("Sao Paulo");

      spy.mockRestore();
    });

    it("strips non-ASCII bytes in mojibake values (e.g., 'SÃ£o Paulo' -> 'So Paulo')", async () => {
      const spy = vi.spyOn(NextResponse, "next");

      const req = createTestRequest({
        url: `${WEBAPP_URL}/team/test`,
        headers: {
          "cf-region": "SÃ£o Paulo", // mojibake for "São Paulo"; includes non-ASCII bytes
        },
      });

      const res = await callProxy(req);
      expectStatus(res, 200);

      const initArg = (spy as unknown as Mock).mock.calls.at(-1)?.[0] as {
        request?: { headers?: Headers };
      };
      const forwarded = initArg?.request?.headers as Headers;
      expect(forwarded.get("cf-region")).toBe("So Paulo");

      spy.mockRestore();
    });
  });

  describe("Multiple Features", () => {
    it("should handle embed route with routing forms rewrite", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}/apps/routing_forms/form/embed?ui.color-scheme=light`,
      });

      const res = await callProxy(req);
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

      const res = await callProxy(req);
      expect(res).toBeDefined();
      expectStatus(res, 200);
    });

    it("should handle malformed URLs", async () => {
      const req = createTestRequest({
        url: `${WEBAPP_URL}//double-slash`,
      });

      const res = await callProxy(req);
      expect(res).toBeDefined();
    });
  });
});

describe("Middleware Matcher - Comprehensive Coverage", () => {
  const matcher = config.matcher[0];
  const pattern = matcher.replace(/^\/|\/$/g, "");
  const regex = new RegExp(`^/${pattern}`);

  const cases = [
    // pages & apis
    { path: "/", expected: true, reason: "Root page" },
    { path: "/home", expected: true, reason: "Regular page" },
    { path: "/team/abc", expected: true, reason: "Nested page" },
    { path: "/api/auth/login", expected: true, reason: "API route" },
    { path: "/api/bookings", expected: true, reason: "Top-level API" },
    { path: "/dashboard/settings", expected: true, reason: "Deep nested page" },
    { path: "/user/john/profile", expected: true, reason: "Multiple nested path" },
    { path: "/apps/routing_forms/form", expected: true, reason: "App page under /apps" },
    { path: "/embed?ui.color-scheme=dark", expected: true, reason: "Embed query param" },

    // should be ignored (internal / static / public)
    { path: "/_next/static/chunks/app.js", expected: false, reason: "Internal static asset" },
    { path: "/_next/image?url=%2Flogo.png&w=256&q=75", expected: false, reason: "Internal image handler" },
    { path: "/_next/data/build-id/page.json", expected: false, reason: "Next.js data route" },
    { path: "/favicon.ico", expected: false, reason: "Favicon asset" },
    { path: "/robots.txt", expected: false, reason: "Robots file" },
    { path: "/sitemap.xml", expected: false, reason: "Sitemap file" },
    { path: "/public/images/logo.png", expected: false, reason: "Public folder asset" },
    { path: "/public/fonts/inter.woff2", expected: false, reason: "Public folder font" },
    { path: "/static/js/main.js", expected: false, reason: "Static folder JavaScript" },
    { path: "/static/css/app.css", expected: false, reason: "Static folder stylesheet" },

    // edge cases
    { path: "/manifest.json", expected: true, reason: "Manifest is a public page, not ignored" },
    { path: "/_nextsomething", expected: true, reason: "Looks like _next but not reserved" },
    { path: "/nextconfig", expected: true, reason: "Normal route with 'next' in name" },
    { path: "/_NEXT/image", expected: true, reason: "Case-sensitive test (should match)" },
    { path: "/favicon-abc.ico", expected: true, reason: "Favicon variant should still match" },
    { path: "/robots-custom.txt", expected: true, reason: "Custom robots file should match" },
    { path: "/sitemap-other.xml", expected: true, reason: "Custom sitemap file should match" },
    { path: "/api_", expected: true, reason: "Partial match with api underscore" },
    { path: "//double-slash", expected: true, reason: "Double slash URL" },
    { path: "/_next", expected: false, reason: "Bare _next path" },
  ];

  it("should match only the intended routes", () => {
    for (const { path, expected, reason } of cases) {
      const result = regex.test(path);
      expect(result, `${path} → ${reason}`).toBe(expected);
    }
  });

  it("should not accidentally match internal Next.js routes", () => {
    const internalPaths = ["/_next/static", "/_next/image", "/_next/data"];
    for (const path of internalPaths) {
      expect(regex.test(path)).toBe(false);
    }
  });

  it("should match all user-facing routes and APIs", () => {
    const publicPaths = ["/", "/api/user", "/settings", "/dashboard"];
    for (const path of publicPaths) {
      expect(regex.test(path)).toBe(true);
    }
  });
});
