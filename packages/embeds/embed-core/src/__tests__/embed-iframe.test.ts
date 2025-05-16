import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { embedStore, getEmbedBookerState } from "../embed-iframe";

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
      return timeoutId;
    });

    // Mock history.replaceState
    window.history.replaceState = (...args) => {
      const url = args[2];
      if (!url) {
        throw new Error("url is not provided");
      }
      vi.spyOn(document, "URL", "get").mockReturnValue(url.toString());
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
    const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
      toBeThereParams: {
        theme: "dark",
        layout: "month",
      },
      toRemoveParams: [],
    });

    // Assert
    expect(document.URL).toContain("theme=dark");
    expect(document.URL).toContain("layout=month");

    // Cleanup
    stopEnsuringQueryParamsInUrl();
  });

  it("should ensure that no existing value of param exists as is", () => {
    fakeCurrentDocumentUrl({ params: { guest: "initial" } });
    const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
      toBeThereParams: { guest: ["ax.com", "bx.com"] },
      toRemoveParams: [],
    });
    expect(document.URL).toContain("guest=ax.com");
    expect(document.URL).toContain("guest=bx.com");
    expect(document.URL).not.toContain("guest=initial");

    stopEnsuringQueryParamsInUrl();
  });

  it("should remove specified parameters from URL", async () => {
    // Setup
    fakeCurrentDocumentUrl({ params: { remove: "true", keep: "yes" } });

    // Execute
    const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
      toBeThereParams: {},
      toRemoveParams: ["remove"],
    });

    // Assert
    expect(document.URL).not.toContain("remove=true");
    expect(document.URL).toContain("keep=yes");

    // Cleanup
    stopEnsuringQueryParamsInUrl();
  });

  it("should handle empty parameters", async () => {
    fakeCurrentDocumentUrl();
    const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
      toBeThereParams: {},
      toRemoveParams: [],
    });
    nextTick();
    stopEnsuringQueryParamsInUrl();
  });

  it("should restore parameters if they are changed before cleanup, otherwise not", async () => {
    fakeCurrentDocumentUrl();
    const initialTheme = "dark";

    const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
      toBeThereParams: { theme: initialTheme },
      toRemoveParams: [],
    });

    // First interval - should add the parameter
    expect(document.URL).toContain(`theme=${initialTheme}`);

    const changedThemeByReact = "light";
    // Simulate React code changing the URL
    fakeCurrentDocumentUrl({ params: { theme: changedThemeByReact } });

    // Next interval - should restore our parameter
    nextTick();
    expect(document.URL).toContain(`theme=${initialTheme}`);

    // After cleanup, changes should not be restored
    stopEnsuringQueryParamsInUrl();
    fakeCurrentDocumentUrl({ params: { theme: "light" } });
    nextTick();
    expect(document.URL).toContain("theme=light");
    expect(document.URL).not.toContain(`theme=${initialTheme}`);
  });
});

describe("getEmbedBookerState", () => {
  it("should return 'initializing' when bookerState is 'loading'", () => {
    const result = getEmbedBookerState({
      bookerState: "loading",
      slotsQuery: {
        isLoading: false,
        isPending: false,
        isSuccess: false,
        isError: false,
      },
    });
    expect(result).toBe("initializing");
  });

  it("should return 'slotsLoading' when slotsQuery.isLoading is true", () => {
    const result = getEmbedBookerState({
      bookerState: "selecting_date",
      slotsQuery: {
        isLoading: true,
        isPending: false,
        isSuccess: false,
        isError: false,
      },
    });
    expect(result).toBe("slotsLoading");
  });

  it("should return 'slotsDone' when slotsQuery.isPending is true but not loading", () => {
    const result = getEmbedBookerState({
      bookerState: "selecting_date",
      slotsQuery: {
        isLoading: false,
        isPending: true,
        isSuccess: false,
        isError: false,
      },
    });
    expect(result).toBe("slotsDone");
  });

  it("should return 'slotsDone' when slotsQuery.isSuccess is true", () => {
    const result = getEmbedBookerState({
      bookerState: "selecting_date",
      slotsQuery: {
        isLoading: false,
        isPending: false,
        isSuccess: true,
        isError: false,
      },
    });
    expect(result).toBe("slotsDone");
  });

  it("should return 'slotsLoadingError' when slotsQuery.isError is true", () => {
    const result = getEmbedBookerState({
      bookerState: "selecting_date",
      slotsQuery: {
        isLoading: false,
        isPending: false,
        isSuccess: false,
        isError: true,
      },
    });
    expect(result).toBe("slotsLoadingError");
  });

  it("should return 'slotsPending' when no other conditions are met", () => {
    const result = getEmbedBookerState({
      bookerState: "selecting_date",
      slotsQuery: {
        isLoading: false,
        isPending: false,
        isSuccess: false,
        isError: false,
      },
    });
    expect(result).toBe("slotsPending");
  });
});
