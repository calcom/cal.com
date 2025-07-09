import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fakeCurrentDocumentUrl, takeBookerToSlotsLoadingState, takeBookerToReadyState } from "./test-utils";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.useRealTimers();
});

describe("isLinkReady", async () => {
  let isLinkReady: typeof import("../lib/utils").isLinkReady;
  let embedStore: typeof import("../lib/embedStore").embedStore;

  beforeEach(async () => {
    ({ isLinkReady } = await import("../lib/utils"));
    ({ embedStore } = await import("../lib/embedStore"));

    // Reset embedStore state to ensure test isolation
    embedStore.parentInformedAboutContentHeight = true;
    embedStore.renderState = null;
    embedStore.connectVersion = 1;
  });

  describe("when skeleton loader is NOT supported (regular loader)", () => {
    it("should return true immediately when no page type is provided", () => {
      fakeCurrentDocumentUrl({ params: {} });
      takeBookerToSlotsLoadingState();

      const result = isLinkReady({ embedStore });
      expect(result).toBe(true);
    });

    it("should return true immediately when page type is empty", () => {
      fakeCurrentDocumentUrl({ params: { "cal.embed.pageType": "" } });
      takeBookerToSlotsLoadingState();

      const result = isLinkReady({ embedStore });
      expect(result).toBe(true);
    });
  });

  describe("when skeleton loader is supported", () => {
    it("should wait for booker to be ready when page type is user.event.booking.slots", () => {
      fakeCurrentDocumentUrl({ params: { "cal.embed.pageType": "user.event.booking.slots" } });
      takeBookerToSlotsLoadingState();

      const result = isLinkReady({ embedStore });
      expect(result).toBe(false); // Should still wait for skeleton loader pages
    });

    it("should return true when booker is ready and page type is user.event.booking.slots", () => {
      fakeCurrentDocumentUrl({ params: { "cal.embed.pageType": "user.event.booking.slots" } });
      takeBookerToReadyState();

      const result = isLinkReady({ embedStore });
      expect(result).toBe(true);
    });
  });

  describe("when not a booker page", () => {
    it("should return true regardless of page type", () => {
      fakeCurrentDocumentUrl({ params: { "cal.embed.pageType": "user.event.booking.slots" } });
      // No _embedBookerState set, so not a booker page

      const result = isLinkReady({ embedStore });
      expect(result).toBe(true);
    });
  });

  describe("when parent not informed about content height", () => {
    it("should return false regardless of other conditions", () => {
      fakeCurrentDocumentUrl({ params: { "cal.embed.pageType": "user.event.booking.slots" } });
      takeBookerToReadyState();
      embedStore.parentInformedAboutContentHeight = false; // Not informed yet

      const result = isLinkReady({ embedStore });
      expect(result).toBe(false);
    });
  });
});
