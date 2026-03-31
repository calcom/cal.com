import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarAdapterError } from "../lib/calendar-adapter-error";
import { fetchWithRetry } from "../lib/fetch-with-retry";

const URL = "https://api.example.com/calendars";
const INIT: RequestInit = { method: "GET" };
const OPTS = { provider: "test_calendar", maxRetries: 2, baseDelayMs: 10 };

function mockResponse(status: number, body = "", headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  } as Response;
}

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Mock setTimeout to execute callbacks immediately (skip retry delays)
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: unknown[]) => void) => {
      callback();
      return 0;
    }) as unknown as typeof globalThis.setTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns immediately on a successful first attempt", async () => {
    const res = mockResponse(200, "ok");
    vi.mocked(fetch).mockResolvedValueOnce(res);

    const result = await fetchWithRetry(URL, INIT, OPTS);

    expect(result).toBe(res);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and respects Retry-After header (seconds)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockResponse(429, "rate limited", { "Retry-After": "1" }))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const result = await fetchWithRetry(URL, INIT, OPTS);

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 and respects Retry-After header (HTTP-date)", async () => {
    const futureDate = new Date(Date.now() + 2000).toUTCString();
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockResponse(429, "rate limited", { "Retry-After": futureDate }))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const result = await fetchWithRetry(URL, INIT, OPTS);

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 with exponential backoff (no Retry-After)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockResponse(500, "internal error"))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const result = await fetchWithRetry(URL, INIT, OPTS);

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting max retries on transient errors", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockResponse(503, "unavailable"))
      .mockResolvedValueOnce(mockResponse(503, "unavailable"))
      .mockResolvedValueOnce(mockResponse(503, "unavailable"));

    await expect(fetchWithRetry(URL, INIT, OPTS)).rejects.toThrow(CalendarAdapterError);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry non-transient errors (400)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse(400, "bad request"));

    await expect(fetchWithRetry(URL, INIT, OPTS)).rejects.toThrow(CalendarAdapterError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry 401 Unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse(401, "unauthorized"));

    await expect(fetchWithRetry(URL, INIT, OPTS)).rejects.toThrow(CalendarAdapterError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry 403 Forbidden", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse(403, "forbidden"));

    await expect(fetchWithRetry(URL, INIT, OPTS)).rejects.toThrow(CalendarAdapterError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on network errors (fetch throws)", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const result = await fetchWithRetry(URL, INIT, OPTS);

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws CalendarAdapterError after max retries on network errors", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = await fetchWithRetry(URL, INIT, OPTS).catch((e) => e);

    expect(error).toBeInstanceOf(CalendarAdapterError);
    expect(error.transient).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
