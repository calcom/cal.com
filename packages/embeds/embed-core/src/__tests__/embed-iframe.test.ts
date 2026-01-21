import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fakeCurrentDocumentUrl, nextTick } from "../embed-iframe/__tests__/test-utils";


describe("embed-iframe", async () => {
  let sdkActionManager: typeof import("../sdk-event").sdkActionManager;
  let embedStore: typeof import("../embed-iframe/lib/embedStore").embedStore
  let resetPageData: typeof import("../embed-iframe/lib/embedStore").resetPageData;
  beforeEach(async () => {
    ({ sdkActionManager } = await import("../sdk-event"));
    ({ embedStore } = await import("../embed-iframe/lib/embedStore"));
    ({ resetPageData } = await import("../embed-iframe/lib/embedStore"));
    // Ensure that we have it globally so that unexpected errors like 'document is not defined' don't happen due to timer being fired when test is shutting down
    vi.useFakeTimers();
    // It is provided by App before embed-iframe loads. So, meet this requirement here.
    window.getEmbedNamespace = vi.fn(() => "default");
    // Ensure document.URL is always defined for tests
    fakeCurrentDocumentUrl();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useRealTimers();
    vi.clearAllTimers();
    embedStore.viewId = null;
    // Ensure document.URL is defined before calling resetPageData which uses log()
    fakeCurrentDocumentUrl();
    resetPageData();
  });

  describe("embedStore.router.ensureQueryParamsInUrl", async () => {
    const originalHistory = window.history;
    const originalURL = window.URL;
    beforeEach(async () => {
      vi.useFakeTimers();
      window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
        const timeoutId = setTimeout(() => {
          callback(performance.now());
        }, 100) as unknown as number;
        return timeoutId;
      });

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
      fakeCurrentDocumentUrl();
      const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
        toBeThereParams: {
          theme: "dark",
          layout: "month",
        },
        toRemoveParams: [],
      });

      expect(document.URL).toContain("theme=dark");
      expect(document.URL).toContain("layout=month");

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

  describe("linkReady event handler", async () => {
    const createTestEmbedState = (overrides?: {
      viewId?: number | null;
      bookerViewedHasFired?: boolean;
      bookerReopenedHasFired?: boolean;
      bookerReloadedHasFired?: boolean;
      bookerReadyHasFired?: boolean;
    }) => {
      embedStore.viewId = overrides?.viewId ?? null;
      embedStore.pageData.eventsState.bookerViewed.hasFired =
        overrides?.bookerViewedHasFired ?? false;
      embedStore.pageData.eventsState.bookerReopened.hasFired =
        overrides?.bookerReopenedHasFired ?? false;
      embedStore.pageData.eventsState.bookerReloaded.hasFired =
        overrides?.bookerReloadedHasFired ?? false;
      embedStore.pageData.eventsState.bookerReady.hasFired = overrides?.bookerReadyHasFired ?? false;
    };
    let embedStore: typeof import("../embed-iframe/lib/embedStore").embedStore;

    beforeEach(async () => {
      ({ embedStore } = await import("../embed-iframe/lib/embedStore"));
      vi.useRealTimers();
      fakeCurrentDocumentUrl();
      const mockTop = {};
      Object.defineProperty(window, "top", {
        value: mockTop,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "isEmbed", {
        value: () => true,
        writable: true,
        configurable: true,
      });
      console.log('Importing embed-iframe');
      await import("../embed-iframe");
      embedStore.viewId = null;
      resetPageData();
    });

    it("should set viewId to 1 when linkReady fires for the first time", () => {
      embedStore.viewId = null;
      resetPageData();
      const initialViewId = embedStore.viewId;

      sdkActionManager?.fire("linkReady", {});

      expect(initialViewId).toBeNull();
      expect(embedStore.viewId).toBe(1);
    });

    it("should increment viewId when linkReady fires on subsequent views", () => {
      embedStore.viewId = 1;
      resetPageData();
      const initialViewId = embedStore.viewId;
      expect(initialViewId).toBe(1);

      sdkActionManager?.fire("linkReady", {});

      expect(embedStore.viewId).toBe(initialViewId + 1);
    });

    it("should reset hasFired flags when linkReady fires", async () => {
      const { embedStore } = await import("../embed-iframe/lib/embedStore");

      embedStore.viewId = 1;
      const oldPageDataReference = embedStore.pageData;
      embedStore.pageData.eventsState.bookerViewed.hasFired = true;
      embedStore.pageData.eventsState.bookerReopened.hasFired = true;
      embedStore.pageData.eventsState.bookerReloaded.hasFired = true;
      embedStore.pageData.eventsState.bookerReady.hasFired = true;

      const initialViewId = embedStore.viewId;

      sdkActionManager?.fire("linkReady", {});

      expect(embedStore.viewId).toBe(initialViewId + 1);
      // Verify resetPageData was called (pageData should be a new object reference)
      expect(embedStore.pageData).not.toEqual(oldPageDataReference);
      // Verify flags were reset
      expect(embedStore.pageData.eventsState.bookerViewed.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReopened.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReloaded.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReady.hasFired).toBe(false);
    });

    it("should not update viewId or reset flags when linkReady fires during prerendering", () => {
      fakeCurrentDocumentUrl({ params: { prerender: "true" } });
      createTestEmbedState({
        viewId: null,
        bookerViewedHasFired: true,
        bookerReopenedHasFired: true,
        bookerReloadedHasFired: true,
        bookerReadyHasFired: true,
      });

      sdkActionManager?.fire("linkReady", {});

      expect(embedStore.viewId).toBeNull();
      expect(embedStore.pageData.eventsState.bookerViewed.hasFired).toBe(true);
      expect(embedStore.pageData.eventsState.bookerReopened.hasFired).toBe(true);
      expect(embedStore.pageData.eventsState.bookerReloaded.hasFired).toBe(true);
      expect(embedStore.pageData.eventsState.bookerReady.hasFired).toBe(true);
    });

    it("should increment viewId and reset flags on multiple linkReady events", () => {
      embedStore.viewId = null;
      resetPageData();

      sdkActionManager?.fire("linkReady", {});
      expect(embedStore.viewId).toBe(1);
      embedStore.pageData.eventsState.bookerViewed.hasFired = true;
      embedStore.pageData.eventsState.bookerReady.hasFired = true;

      sdkActionManager?.fire("linkReady", {});
      expect(embedStore.viewId).toBe(2);
      expect(embedStore.pageData.eventsState.bookerViewed.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReopened.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReloaded.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReady.hasFired).toBe(false);

      sdkActionManager?.fire("linkReady", {});
      expect(embedStore.viewId).toBe(3);
    });
  });
});
