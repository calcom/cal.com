import { describe, expect, it, vi, beforeEach } from "vitest";

import { SIGNUP_ERROR_CODES } from "../constants";
import { fetchSignup, isUserAlreadyExistsError, hasCheckoutSession } from "./fetchSignup";

const createSuccessResponse = (data = { message: "Created user" }) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const createErrorResponse = (status: number, error: { message: string; checkoutSessionId?: string }) => ({
  ok: false,
  status,
  json: () => Promise.resolve(error),
});

describe("fetchSignup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success when signup completes", async () => {
    global.fetch = vi.fn().mockResolvedValue(createSuccessResponse());

    const result = await fetchSignup({
      email: "test@example.com",
      password: "password123",
      language: "en",
    });

    expect(result.ok).toBe(true);
  });

  it("returns error with status code when signup fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createErrorResponse(409, { message: "Username is already taken" })
    );

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
