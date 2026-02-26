import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls fetch with the provided URL and options", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok"));

    const promise = fetchWithTimeout("https://example.com", { method: "POST" }, 5000);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("passes AbortController signal to fetch", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok"));

    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns the fetch response on success", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(mockResponse);
  });

  it("aborts request after timeout", async () => {
    mockFetch.mockImplementationOnce(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = fetchWithTimeout("https://example.com", {}, 1000);
    vi.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow("aborted");
  });

  it("clears timeout after successful response", async () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    mockFetch.mockResolvedValueOnce(new Response("ok"));

    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    await vi.runAllTimersAsync();
    await promise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("clears timeout even when fetch throws", async () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    await expect(promise).rejects.toThrow("Network error");

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
