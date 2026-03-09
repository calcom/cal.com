import type { IncomingHttpHeaders } from "node:http";
import { filterReqHeaders } from "./filterReqHeaders";

describe("filterReqHeaders", () => {
  it("should never include the Authorization header", () => {
    const headers: IncomingHttpHeaders = {
      authorization: "Bearer cal_live_secret_key_abc123",
      "content-type": "application/json",
      host: "api.cal.com",
    };

    const filtered = filterReqHeaders(headers);

    expect(filtered).not.toHaveProperty("Authorization");
    expect(filtered).not.toHaveProperty("authorization");
    expect(JSON.stringify(filtered)).not.toContain("cal_live_secret_key_abc123");
  });

  it("should include safe headers", () => {
    const headers: IncomingHttpHeaders = {
      "content-type": "application/json",
      "x-cal-client-id": "client-123",
      "cal-api-version": "2024-06-14",
      "x-request-id": "req-abc",
      "user-agent": "TestAgent/1.0",
      "x-forwarded-for": "1.2.3.4",
      "x-forwarded-host": "api.cal.com",
      "cf-connecting-ip": "5.6.7.8",
      "cloudfront-viewer-address": "9.10.11.12",
      "x-vercel-id": "iad1::abc123",
      "x-vercel-deployment-url": "cal-abc123.vercel.app",
      "x-vercel-country": "US",
      "x-vercel-region": "iad1",
      host: "api.cal.com",
    };

    const filtered = filterReqHeaders(headers);

    expect(filtered["Content-Type"]).toBe("application/json");
    expect(filtered["X-Cal-Client-Id"]).toBe("client-123");
    expect(filtered["Cal-Api-Version"]).toBe("2024-06-14");
    expect(filtered["X-Request-Id"]).toBe("req-abc");
    expect(filtered["User-Agent"]).toBe("TestAgent/1.0");
    expect(filtered["X-Forwarded-For"]).toBe("1.2.3.4");
    expect(filtered["X-Forwarded-Host"]).toBe("api.cal.com");
    expect(filtered["CF-Connecting-IP"]).toBe("5.6.7.8");
    expect(filtered["CloudFront-Viewer-Address"]).toBe("9.10.11.12");
    expect(filtered["X-Vercel-Id"]).toBe("iad1::abc123");
    expect(filtered["X-Vercel-Deployment-Url"]).toBe("cal-abc123.vercel.app");
    expect(filtered["X-Vercel-Country"]).toBe("US");
    expect(filtered["X-Vercel-Region"]).toBe("iad1");
    expect(filtered.Host).toBe("api.cal.com");
  });

  it("should handle empty headers", () => {
    const filtered = filterReqHeaders({});

    expect(filtered).toBeDefined();
    expect(filtered).not.toHaveProperty("Authorization");
  });
});
