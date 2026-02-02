import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { SIGNUP_ERROR_CODES } from "../constants";
import { fetchSignup, isUserAlreadyExistsError, hasCheckoutSession } from "./fetchSignup";

function createJsonResponse(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchSignup", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns success when signup completes", async () => {
    fetchSpy.mockResolvedValue(createJsonResponse({ message: "Created user" }));

    const result = await fetchSignup({
      email: "test@example.com",
      password: "password123",
      language: "en",
    });

    expect(result.ok).toBe(true);
  });

  it("returns error with status code when signup fails", async () => {
    fetchSpy.mockResolvedValue(createJsonResponse({ message: "Username is already taken" }, 409));

    const result = await fetchSignup({
      email: "test@example.com",
      password: "password123",
      language: "en",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });
});

describe("isUserAlreadyExistsError", () => {
  it("returns true for 409 with user_already_exists message", () => {
    const result = {
      ok: false as const,
      status: 409,
      error: { message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS },
    };

    expect(isUserAlreadyExistsError(result)).toBe(true);
  });

  it("returns false for other error messages", () => {
    const result = {
      ok: false as const,
      status: 409,
      error: { message: "Username is already taken" },
    };

    expect(isUserAlreadyExistsError(result)).toBe(false);
  });

  it("returns false for success responses", () => {
    const result = {
      ok: true as const,
      data: { message: "Created user" },
    };

    expect(isUserAlreadyExistsError(result)).toBe(false);
  });
});

describe("hasCheckoutSession", () => {
  it("returns true when checkoutSessionId exists", () => {
    const result = {
      ok: false as const,
      status: 402,
      error: { message: "Payment required", checkoutSessionId: "cs_123" },
    };

    expect(hasCheckoutSession(result)).toBe(true);
  });

  it("returns false when checkoutSessionId is absent", () => {
    const result = {
      ok: false as const,
      status: 409,
      error: { message: "Error" },
    };

    expect(hasCheckoutSession(result)).toBe(false);
  });
});
