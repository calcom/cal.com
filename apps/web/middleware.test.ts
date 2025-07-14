import { NextRequest } from "next/server";
import { describe, it, expect } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { checkPostMethod } from "./middleware";

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
