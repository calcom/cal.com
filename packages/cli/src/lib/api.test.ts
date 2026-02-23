import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  getAuthToken: vi.fn().mockReturnValue("cal_test_key"),
  getApiKey: vi.fn().mockReturnValue("cal_test_key"),
  getApiUrl: vi.fn().mockReturnValue("https://api.cal.com"),
}));

const mockFetch: ReturnType<typeof vi.fn> = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { apiRequest } from "./api";

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
    expect(options.headers["cal-api-version"]).toBe("2024-08-13");
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
