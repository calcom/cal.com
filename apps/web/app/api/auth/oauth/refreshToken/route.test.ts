import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({ default: {
  oAuthClient: { findFirst: vi.fn().mockResolvedValue({ redirectUri: "https://example.com/cb" }) },
} }));
vi.mock("@calcom/trpc/server/routers/viewer/oAuth/addClient.handler", () => ({
  generateSecret: (s: string) => [s, "salt"],
}));

// Mock Next.js server utilities
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

// Mock path-alias modules used by the route
vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (handler: any) => handler,
}), { virtual: true });
vi.mock("app/api/parseRequestData", () => ({
  parseUrlFormData: async (req: any) => Object.fromEntries(new URLSearchParams(await req.text())),
}), { virtual: true });

const { jwtStubs } = vi.hoisted(() => ({
  jwtStubs: { verify: vi.fn(), sign: vi.fn(), decode: vi.fn() },
}));
vi.mock("jsonwebtoken", () => ({ default: jwtStubs }));

// Import after mocks
import prisma from "@calcom/prisma";
import { refreshTokenHandler } from "./route";

function makeRequest(headers: Record<string, string>, body: string): any {
  return {
    headers: new Headers(headers),
    text: async () => body,
    nextUrl: new URL("https://cal.test/api/auth/oauth/refreshToken"),
    method: "POST",
  } as any;
}

describe("oauth refreshToken route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-seed prisma mock after reset
    (prisma as any).oAuthClient.findFirst.mockResolvedValue({ redirectUri: "https://example.com/cb" });
    // set a default sign return value
  jwtStubs.sign.mockReturnValueOnce("new_access").mockReturnValueOnce("new_refresh");
  });

  it("returns new access and rotated refresh token on valid refresh", async () => {
    const payload = { userId: 1, teamId: null, scope: ["*"], token_type: "Refresh Token", clientId: "cid" };
  jwtStubs.verify.mockReturnValueOnce(payload);
    const req = makeRequest(
      { "content-type": "application/x-www-form-urlencoded", authorization: "Bearer old_refresh" },
      "grant_type=refresh_token&client_id=cid&client_secret=shh"
    );

    const res = (await refreshTokenHandler(req, { params: Promise.resolve({}) as any })) as any;
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.access_token).toBe("new_access");
    expect(json.refresh_token).toBe("new_refresh");
  });

  it("allows refresh within grace period when token is expired", async () => {
    const err = new Error("expired");
    // @ts-expect-error add name
    err.name = "TokenExpiredError";
  jwtStubs.verify.mockImplementationOnce(() => { throw err; });

    const now = Math.floor(Date.now() / 1000);
    const decoded = { userId: 1, teamId: null, scope: ["*"], token_type: "Refresh Token", clientId: "cid", exp: now - 60 };
  jwtStubs.decode.mockReturnValueOnce(decoded);

    const req = makeRequest(
      { "content-type": "application/x-www-form-urlencoded", authorization: "Bearer old_refresh" },
      "grant_type=refresh_token&client_id=cid&client_secret=shh"
    );

    // next sign calls for access and refresh
  jwtStubs.sign.mockReturnValueOnce("new_access").mockReturnValueOnce("new_refresh");

    const res = (await refreshTokenHandler(req, { params: Promise.resolve({}) as any })) as any;
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.access_token).toBe("new_access");
    expect(json.refresh_token).toBe("new_refresh");
  });

  it("rejects when expired beyond grace", async () => {
    const err = new Error("expired");
    // @ts-expect-error add name
    err.name = "TokenExpiredError";
  jwtStubs.verify.mockImplementationOnce(() => { throw err; });

    const now = Math.floor(Date.now() / 1000);
    const decoded = { userId: 1, teamId: null, scope: ["*"], token_type: "Refresh Token", clientId: "cid", exp: now - (8 * 24 * 60 * 60) };
  jwtStubs.decode.mockReturnValueOnce(decoded);

    const req = makeRequest(
      { "content-type": "application/x-www-form-urlencoded", authorization: "Bearer old_refresh" },
      "grant_type=refresh_token&client_id=cid&client_secret=shh"
    );

    const res = (await refreshTokenHandler(req, { params: Promise.resolve({}) as any })) as any;
    expect(res.status).toBe(401);
  });
});
