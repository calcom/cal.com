import { describe, it, expect } from "vitest";

import { HttpError } from "@calcom/lib/http-error";

import checkSession from "./auth";

describe("checkSession", () => {
  it("should return session when valid session with user.id exists", () => {
    const req = {
      session: {
        user: { id: 1 },
      },
    } as Parameters<typeof checkSession>[0];

    const result = checkSession(req);
    expect(result).toEqual({ user: { id: 1 } });
  });

  it("should throw 401 when session is missing", () => {
    const req = {} as Parameters<typeof checkSession>[0];

    expect(() => checkSession(req)).toThrow(HttpError);
    try {
      checkSession(req);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(401);
    }
  });

  it("should throw 401 when user.id is missing", () => {
    const req = {
      session: {
        user: {},
      },
    } as Parameters<typeof checkSession>[0];

    expect(() => checkSession(req)).toThrow(HttpError);
    try {
      checkSession(req);
    } catch (error) {
      expect((error as HttpError).statusCode).toBe(401);
    }
  });
});
