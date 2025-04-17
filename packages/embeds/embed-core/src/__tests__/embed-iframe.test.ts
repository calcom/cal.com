import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { embedStore } from "../embed-iframe";

// Test helper functions
type fakeCurrentDocumentUrlParams = {
  origin?: string;
  path?: string;
  params?: Record<string, string>;
};

function fakeCurrentDocumentUrl({
  origin = "https://example.com",
  path = "",
  params = {},
}: fakeCurrentDocumentUrlParams = {}) {
  const url = new URL(path, origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return mockDocumentUrl(url);
}

function mockDocumentUrl(url: URL | string) {
  return vi.spyOn(document, "URL", "get").mockReturnValue(url.toString());
}

function createSearchParams(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return searchParams;
}

describe("embedStore.router.ensureQueryParamsInUrl", () => {
  // Mock window.history and URL
  const timeouts: number[] = [];

  const originalHistory = window.history;
  const originalURL = window.URL;

  function nextTick() {
    vi.advanceTimersByTime(100);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame and cancelAnimationFrame
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      console.log("mockRequestAnimationFrame called");
      const timeoutId = setTimeout(() => {
        callback(performance.now());
      }, 100) as unknown as number;
      timeouts.push(timeoutId);
      return timeoutId;
    });

    // Mock history.replaceState
    window.history.replaceState = (...args) => {
      vi.spyOn(document, "URL", "get").mockReturnValue(args[2]);
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    // Cleanup
    window.history = originalHistory;
    window.URL = originalURL;
    vi.resetAllMocks();
  });

  it("should add missing parameters to URL", async () => {
    // Setup
    fakeCurrentDocumentUrl();

    // Execute
    const cleanup = embedStore.router.ensureQueryParamsInUrl({
      toBeThereSearchParams: createSearchParams({
        theme: "dark",
        layout: "month",
      }),
      toRemoveParams: [],
    });

    // Assert
    expect(document.URL).toContain("theme=dark");
    expect(document.URL).toContain("layout=month");

    // Cleanup
    cleanup();
  });

  it("should remove specified parameters from URL", async () => {
    // Setup
    fakeCurrentDocumentUrl({ params: { remove: "true", keep: "yes" } });

    // Execute
    const cleanup = embedStore.router.ensureQueryParamsInUrl({
      toBeThereSearchParams: new URLSearchParams(),
      toRemoveParams: ["remove"],
    });

    // Assert
    expect(document.URL).not.toContain("remove=true");
    expect(document.URL).toContain("keep=yes");

    // Cleanup
    cleanup();
  });

  it("should not call pushState if no changes needed", async () => {
    // Setup
    fakeCurrentDocumentUrl({ params: { theme: "dark" } });

    // Execute
    const cleanup = embedStore.router.ensureQueryParamsInUrl({
      toBeThereSearchParams: createSearchParams({ theme: "dark" }),
      toRemoveParams: [],
    });

    // Cleanup
    cleanup();
  });

  it("should handle empty parameters", async () => {
    fakeCurrentDocumentUrl();
    const cleanup = embedStore.router.ensureQueryParamsInUrl({
      toBeThereSearchParams: new URLSearchParams(),
      toRemoveParams: [],
    });
    await nextTick();
    cleanup();
  });

  it("should restore parameters if they are changed before cleanup", async () => {
    // Setup
    fakeCurrentDocumentUrl();

    // Execute
    const cleanup = embedStore.router.ensureQueryParamsInUrl({
      toBeThereSearchParams: createSearchParams({ theme: "dark" }),
      toRemoveParams: [],
    });

    // First interval - should add the parameter
    expect(document.URL).toContain("theme=dark");

    // Simulate React code changing the URL
    fakeCurrentDocumentUrl({ params: { theme: "light" } });

    // Next interval - should restore our parameter
    await nextTick();
    expect(document.URL).toContain("theme=dark");

    // After cleanup, changes should not be restored
    cleanup();
    fakeCurrentDocumentUrl({ params: { theme: "light" } });
    await nextTick();
    expect(document.URL).toContain("theme=light");
  });
});
