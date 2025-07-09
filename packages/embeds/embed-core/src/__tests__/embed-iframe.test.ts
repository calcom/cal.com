import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fakeCurrentDocumentUrl, nextTick } from "../embed-iframe/__tests__/test-utils";

beforeEach(() => {
  // Ensure that we have it globally so that unexpected errors like 'document is not defined' don't happen due to timer being fired when test is shutting down
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.useRealTimers();
});

describe("embedStore.router.ensureQueryParamsInUrl", async () => {
  let embedStore: typeof import("../embed-iframe/lib/embedStore").embedStore;
  const originalHistory = window.history;
  const originalURL = window.URL;

  beforeEach(async () => {
    // Mock window.history and URL
    ({ embedStore } = await import("../embed-iframe/lib/embedStore"));

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

describe("getEmbedBookerState", async () => {
  let getEmbedBookerState: typeof import("../embed-iframe").getEmbedBookerState;
  beforeEach(async () => {
    fakeCurrentDocumentUrl();
    ({ getEmbedBookerState } = await import("../embed-iframe"));
  });

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

describe("methods", async () => {
  let methods: typeof import("../embed-iframe").methods;
  let embedStore: typeof import("../embed-iframe/lib/embedStore").embedStore;
  let isLinkReadyMock: ReturnType<typeof vi.fn> | undefined;
  let isBookerReadyMock: ReturnType<typeof vi.fn> | undefined;
  let ensureQueryParamsInUrlMock: ReturnType<typeof vi.fn> | undefined;
  let recordResponseIfQueuedMock: ReturnType<typeof vi.fn> | undefined;
  beforeEach(async () => {
    vi.useRealTimers();
    fakeCurrentDocumentUrl();
    vi.doMock("../embed-iframe/lib/utils", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../embed-iframe/lib/utils")>();
      return {
        ...actual,
        isLinkReady: isLinkReadyMock,
        isBookerReady: isBookerReadyMock,
        recordResponseIfQueued: recordResponseIfQueuedMock,
      };
    });
    vi.doMock("../embed-iframe/lib/embedStore", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../embed-iframe/lib/embedStore")>();

      return {
        ...actual,
        embedStore: {
          ...actual.embedStore,
          router: {
            ensureQueryParamsInUrl: ensureQueryParamsInUrlMock,
          },
        },
      };
    });
    isLinkReadyMock = vi.fn();
    isBookerReadyMock = vi.fn();
    ensureQueryParamsInUrlMock = vi.fn().mockImplementation(() => {
      console.log("Fake ensureQueryParamsInUrl called");
      return {
        stopEnsuringQueryParamsInUrl: vi.fn(),
      };
    });
    recordResponseIfQueuedMock = vi.fn().mockResolvedValue(1);
    ({ methods } = await import("../embed-iframe"));
    ({ embedStore } = await import("../embed-iframe/lib/embedStore"));
  });

  describe("methods.connect", async () => {
    it("should ensure that 'cal.embed.connectVersion' is incremented in query params", async () => {
      embedStore.renderState = "completed";
      const currentConnectVersion = 1;
      embedStore.connectVersion = currentConnectVersion;
      fakeCurrentDocumentUrl({ params: { "cal.embed.connectVersion": "1" } });
      isLinkReadyMock?.mockReturnValue(true);
      isBookerReadyMock?.mockReturnValue(true);
      await methods.connect({
        config: {},
        params: {},
      });
      expect(ensureQueryParamsInUrlMock).toHaveBeenCalledWith({
        toBeThereParams: {
          "cal.embed.connectVersion": (currentConnectVersion + 1).toString(),
        },
        toRemoveParams: ["preload", "prerender", "cal.skipSlotsFetch"],
      });
    });

    it("should ensure that 'cal.embed.connectVersion' is not incremented in query params when 'cal.embed.noSlotsFetchOnConnect' is true", async () => {
      embedStore.renderState = "completed";
      const currentConnectVersion = 1;
      embedStore.connectVersion = currentConnectVersion;
      fakeCurrentDocumentUrl({ params: { "cal.embed.connectVersion": "1" } });
      isLinkReadyMock?.mockReturnValue(true);
      isBookerReadyMock?.mockReturnValue(true);
      await methods.connect({
        config: {
          "cal.embed.noSlotsFetchOnConnect": "true",
        },
        params: {},
      });
      expect(embedStore.router.ensureQueryParamsInUrl).toHaveBeenCalledWith({
        toBeThereParams: {
          "cal.embed.connectVersion": currentConnectVersion.toString(),
        },
        toRemoveParams: ["preload", "prerender", "cal.skipSlotsFetch"],
      });
    });

    it("should set/update 'cal.routingFormResponseId' if the current iframe has 'cal.queuedFormResponse' in the query params", async () => {
      embedStore.renderState = "completed";
      const currentConnectVersion = 1;
      embedStore.connectVersion = currentConnectVersion;
      fakeCurrentDocumentUrl({
        params: {
          "cal.queuedFormResponse": "true",
          "cal.routingFormResponseId": "1",
          "cal.embed.connectVersion": currentConnectVersion.toString(),
        },
      });
      const convertedRoutingFormResponseId = 101;
      recordResponseIfQueuedMock?.mockResolvedValue(convertedRoutingFormResponseId);
      isLinkReadyMock?.mockReturnValue(true);
      isBookerReadyMock?.mockReturnValue(true);
      await methods.connect({
        config: {},
        params: {},
      });

      expect(ensureQueryParamsInUrlMock).toHaveBeenCalledWith({
        toBeThereParams: {
          "cal.embed.connectVersion": (currentConnectVersion + 1).toString(),
          "cal.routingFormResponseId": convertedRoutingFormResponseId.toString(),
        },
        toRemoveParams: ["preload", "prerender", "cal.skipSlotsFetch"],
      });
    });
  });

  describe("methods.parentKnowsIframeReady", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should set renderState to 'completed' on link ready", () => {
      isLinkReadyMock?.mockReturnValue(true);
      methods.parentKnowsIframeReady({});
      expect(embedStore.renderState).not.toBe("completed");
      nextTick();
      expect(embedStore.renderState).toBe("completed");
    });
  });
});
