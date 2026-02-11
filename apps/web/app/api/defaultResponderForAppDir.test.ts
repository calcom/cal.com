import type { Params } from "app/_types";
import { NextResponse, type NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";

import { TRPCError } from "@trpc/server";

import { defaultResponderForAppDir } from "./defaultResponderForAppDir";

vi.mock("next/server", () => {
  class MockNextRequest extends Request {}
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((body, init) => ({
        json: vi.fn().mockResolvedValue(body),
        status: init?.status || 200,
      })),
    },
  };
});

describe("defaultResponderForAppDir", () => {
  it("should return a JSON response when handler resolves with a result", async () => {
    const f = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const req = { method: "GET", url: "/api/test" } as unknown as NextRequest;
    const params = Promise.resolve<Params>({});

    const response = await defaultResponderForAppDir(f)(req, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true });
  });

  it("should return an empty JSON response when handler resolves with no result", async () => {
    const f = vi.fn().mockResolvedValue(null);
    const req = { method: "GET", url: "/api/test" } as unknown as NextRequest;
    const params = Promise.resolve<Params>({});

    const response = await defaultResponderForAppDir(f)(req, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({});
  });

  it("should respond with status code 409 for NoAvailableUsersFound", async () => {
    const f = vi.fn().mockRejectedValue(new Error(ErrorCode.NoAvailableUsersFound));
    const req = { method: "GET", url: "/api/test" } as unknown as NextRequest;
    const params = Promise.resolve<Params>({});

    const response = await defaultResponderForAppDir(f)(req, { params });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual({
      message: ErrorCode.NoAvailableUsersFound,
      url: undefined,
      method: undefined,
    });
  });

  it("should respond with a 429 status code for rate limit errors", async () => {
    const f = vi.fn().mockRejectedValue(new TRPCError({ code: "TOO_MANY_REQUESTS" }));
    const req = { method: "POST", url: "/api/test" } as unknown as NextRequest;
    const params = Promise.resolve<Params>({});

    const response = await defaultResponderForAppDir(f)(req, { params });
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json).toEqual({
      message: "TOO_MANY_REQUESTS",
      url: undefined,
      method: undefined,
    });
  });
});
