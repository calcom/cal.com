import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  getAuthToken: vi.fn().mockResolvedValue("cal_test_key"),
  getApiKey: vi.fn().mockResolvedValue("cal_test_key"),
  getApiUrl: vi.fn().mockReturnValue("https://api.cal.com"),
}));

const mockFetch: ReturnType<typeof vi.fn> = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { apiRequest, formatApiError } from "./api";

describe("apiRequest", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes GET request with correct headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { id: 1 } }),
    });

    await apiRequest("/v2/me");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.cal.com/v2/me");
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer cal_test_key");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["cal-api-version"]).toBeUndefined();
  });

  it("returns parsed JSON response", async () => {
    const responseData = { status: "success", data: { id: 1, name: "Test" } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => responseData,
    });

    const result = await apiRequest<{ id: number; name: string }>("/v2/me");
    expect(result.status).toBe("success");
    expect(result.data).toEqual({ id: 1, name: "Test" });
  });

  it("appends query parameters to URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: [] }),
    });

    await apiRequest("/v2/bookings", {
      query: { status: "upcoming", take: "10" },
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("?");
    expect(url).toContain("status=upcoming");
    expect(url).toContain("take=10");
  });

  it("skips undefined query parameters", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: [] }),
    });

    await apiRequest("/v2/bookings", {
      query: { status: "upcoming", skip: undefined },
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("status=upcoming");
    expect(url).not.toContain("skip");
  });

  it("handles array query parameters", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: [] }),
    });

    await apiRequest("/v2/bookings", {
      query: { eventTypeIds: ["1", "2", "3"] },
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("eventTypeIds=1");
    expect(url).toContain("eventTypeIds=2");
    expect(url).toContain("eventTypeIds=3");
  });

  it("sends POST request with body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { id: 1 } }),
    });

    await apiRequest("/v2/bookings", {
      method: "POST",
      body: { title: "Test Booking", start: "2024-03-01T10:00:00Z" },
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ title: "Test Booking", start: "2024-03-01T10:00:00Z" }));
  });

  it("does not send body for GET requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: {} }),
    });

    await apiRequest("/v2/me", {
      method: "GET",
      body: { shouldNotAppear: true },
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toBeUndefined();
  });

  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success" }),
    });

    await apiRequest("/v2/webhooks/123", { method: "DELETE" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.cal.com/v2/webhooks/123");
    expect(options.method).toBe("DELETE");
  });

  it("sends PATCH request with body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { id: 1 } }),
    });

    await apiRequest("/v2/event-types/42", {
      method: "PATCH",
      body: { title: "Updated" },
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("PATCH");
    expect(options.body).toBe(JSON.stringify({ title: "Updated" }));
  });

  it("throws error on non-ok response with JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ message: "Invalid API key" }),
    });

    await expect(apiRequest("/v2/me")).rejects.toThrow("API Error (401): Invalid API key");
  });

  it("parses validation error with nested details.errors[].constraints", async () => {
    const errorResponse = {
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          message: "Bad Request Exception",
          errors: [
            {
              property: "take",
              constraints: {
                min: "take must not be less than 1",
              },
            },
          ],
        },
      },
    };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify(errorResponse),
    });

    await expect(apiRequest("/v2/bookings")).rejects.toThrow(
      "API Error (400): take: take must not be less than 1"
    );
  });

  it("parses error with nested error object (error.message string)", async () => {
    const errorResponse = {
      status: "error",
      error: {
        code: "NOT_FOUND",
        message: "Invalid Query: The requested record was not found.",
      },
    };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => JSON.stringify(errorResponse),
    });

    await expect(apiRequest("/v2/bookings/xyz")).rejects.toThrow(
      "API Error (404): Invalid Query: The requested record was not found."
    );
  });

  it("parses multiple validation errors into semicolon-separated message", async () => {
    const errorResponse = {
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          errors: [
            {
              property: "start",
              constraints: { isNotEmpty: "start should not be empty" },
            },
            {
              property: "eventTypeId",
              constraints: { isNumber: "eventTypeId must be a number" },
            },
          ],
        },
      },
    };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify(errorResponse),
    });

    await expect(apiRequest("/v2/bookings")).rejects.toThrow(
      "API Error (400): start: start should not be empty; eventTypeId: eventTypeId must be a number"
    );
  });

  it("parses error with error as plain string", async () => {
    const errorResponse = { error: "Unauthorized access" };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify(errorResponse),
    });

    await expect(apiRequest("/v2/me")).rejects.toThrow("API Error (401): Unauthorized access");
  });

  it("throws error on non-ok response with plain text body", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server crashed",
    });

    await expect(apiRequest("/v2/me")).rejects.toThrow("API Error (500): Server crashed");
  });

  it("throws error when text() fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => {
        throw new Error("Network error");
      },
    });

    await expect(apiRequest("/v2/me")).rejects.toThrow("API Error (503): HTTP 503 Service Unavailable");
  });

  it("merges custom headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success" }),
    });

    await apiRequest("/v2/me", {
      headers: { "X-Custom-Header": "test-value" },
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Custom-Header"]).toBe("test-value");
    expect(options.headers.Authorization).toBe("Bearer cal_test_key");
  });

  it("handles empty query object", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: [] }),
    });

    await apiRequest("/v2/bookings", { query: {} });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.cal.com/v2/bookings");
  });
});

describe("formatApiError", () => {
  it("extracts message from error.message", () => {
    const result = formatApiError({
      status: "error",
      error: { code: "TRPCError", message: "The requested resource was not found" },
    });
    expect(result).toBe("The requested resource was not found");
  });

  it("extracts validation constraints from error.details.errors", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          errors: [
            {
              property: "take",
              constraints: { min: "take must not be less than 1" },
            },
          ],
        },
      },
    });
    expect(result).toBe("take: take must not be less than 1");
  });

  it("joins multiple validation errors with semicolons", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          errors: [
            {
              property: "start",
              constraints: { isNotEmpty: "start should not be empty" },
            },
            {
              property: "end",
              constraints: { isNotEmpty: "end should not be empty" },
            },
          ],
        },
      },
    });
    expect(result).toBe("start: start should not be empty; end: end should not be empty");
  });

  it("handles multiple constraints on a single property", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          errors: [
            {
              property: "email",
              constraints: {
                isEmail: "email must be an email",
                isNotEmpty: "email should not be empty",
              },
            },
          ],
        },
      },
    });
    expect(result).toContain("email: email must be an email");
    expect(result).toContain("email: email should not be empty");
  });

  it("handles nested children validation errors", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          errors: [
            {
              property: "attendee",
              children: [
                {
                  property: "email",
                  constraints: { isEmail: "email must be a valid email" },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result).toBe("attendee.email: email must be a valid email");
  });

  it("falls back to error.message when details has no errors array", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Some validation failed",
        details: { message: "Some validation failed" },
      },
    });
    expect(result).toBe("Some validation failed");
  });

  it("handles error.details as a plain string", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        details: "Something went wrong internally",
      },
    });
    expect(result).toBe("Something went wrong internally");
  });

  it("falls back to error.code when no message or details", () => {
    const result = formatApiError({
      status: "error",
      error: { code: "FORBIDDEN" },
    });
    expect(result).toBe("FORBIDDEN");
  });

  it("handles error as plain string", () => {
    const result = formatApiError({ error: "Rate limit exceeded" });
    expect(result).toBe("Rate limit exceeded");
  });

  it("handles top-level message field", () => {
    const result = formatApiError({ message: "Invalid API key" });
    expect(result).toBe("Invalid API key");
  });

  it("falls back to JSON.stringify for unrecognized formats", () => {
    const result = formatApiError({ status: "error" });
    expect(result).toBe('{"status":"error"}');
  });

  it("handles empty error object", () => {
    const result = formatApiError({ error: { code: "", message: "" } });
    expect(result).toBe('{"error":{"code":"","message":""}}');
  });

  it("handles validation errors without property names", () => {
    const result = formatApiError({
      error: {
        code: "BadRequestException",
        details: {
          errors: [
            {
              constraints: { isValid: "value is not valid" },
            },
          ],
        },
      },
    });
    expect(result).toBe("value is not valid");
  });

  it("handles Zod error format (code + message string)", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BAD_REQUEST",
        message: "startDate - Required, endDate - Required, ",
      },
    });
    expect(result).toBe("startDate - Required, endDate - Required, ");
  });

  it("handles Prisma not found error format", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "NOT_FOUND",
        message: "Invalid Query: The requested record was not found.",
      },
    });
    expect(result).toBe("Invalid Query: The requested record was not found.");
  });

  it("handles rate limit error (429)", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "TRPCError",
        message: "You have exceeded the allowed number of requests",
      },
    });
    expect(result).toBe("You have exceeded the allowed number of requests");
  });

  it("prioritizes validation details over error.message", () => {
    const result = formatApiError({
      status: "error",
      error: {
        code: "BadRequestException",
        message: "Bad Request Exception",
        details: {
          errors: [
            {
              property: "name",
              constraints: { isNotEmpty: "name should not be empty" },
            },
          ],
        },
      },
    });
    expect(result).toBe("name: name should not be empty");
  });
});
