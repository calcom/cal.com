import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { sdkActionManager } from "../../sdk-event";
import { embedStore, resetViewVariables } from "../lib/embedStore";
import { useBookerEmbedEvents } from "../react-hooks";
import { fakeCurrentDocumentUrl } from "./test-utils";

describe("useBookerEmbedEvents", () => {
  let firedEvents: Array<{ type: string; data: unknown }> = [];

  beforeEach(() => {
    // Reset embedStore state
    embedStore.eventsState.viewId = null;
    embedStore.eventsState.bookerViewedFamily.hasFired = false;
    embedStore.eventsState.bookerReady.hasFired = false;
    embedStore.eventsState.reloadInitiated = false;

    // Clear fired events
    firedEvents = [];

    // Mock sdkActionManager.fire to capture events
    vi.spyOn(sdkActionManager || {}, "fire").mockImplementation((type, data) => {
      firedEvents.push({ type: type as string, data });
    });

    // Mock window
    Object.defineProperty(window, "document", {
      value: { URL: "https://example.com" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("bookerViewed event", () => {
    it("should fire bookerViewed on first view when slots are loaded", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toHaveLength(2);
      expect(firedEvents[0]).toMatchObject({
        type: "bookerViewed",
        data: {
          eventId: 123,
          eventSlug: "test-event",
          slotsLoaded: true,
        },
      });
    });

    it("should fire bookerViewed on first view when slots are not loaded", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: false,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toHaveLength(1);
      expect(firedEvents[0]).toMatchObject({
        type: "bookerViewed",
        data: {
          eventId: null,
          eventSlug: null,
          slotsLoaded: false,
        },
      });
    });

    it("should fire bookerReopened on subsequent views", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 2; // Second view

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toHaveLength(2);
      expect(firedEvents[0]).toMatchObject({
        type: "bookerReopened",
        data: {
          eventId: 123,
          eventSlug: "test-event",
          slotsLoaded: true,
        },
      });
    });

    it("should fire bookerReloaded when reloadInitiated flag is set", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;
      embedStore.eventsState.reloadInitiated = true;

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toHaveLength(2);
      expect(firedEvents[0]).toMatchObject({
        type: "bookerReloaded",
        data: {
          eventId: 123,
          eventSlug: "test-event",
          slotsLoaded: true,
        },
      });
      expect(embedStore.eventsState.reloadInitiated).toBe(false);
    });

    it("should not fire events multiple times for the same view", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      const { rerender } = renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toHaveLength(2);

      // Rerender should not fire events again
      rerender();
      expect(firedEvents).toHaveLength(2);
    });
  });

  describe("bookerReady event", () => {
    it("should fire bookerReady only once per link view when slots are loaded", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      const { rerender } = renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toContainEqual({
        type: "bookerReady",
        data: {
          eventId: 123,
          eventSlug: "test-event",
        },
      });

      // Rerender should not fire bookerReady again
      rerender();
      const bookerReadyEvents = firedEvents.filter((e) => e.type === "bookerReady");
      expect(bookerReadyEvents).toHaveLength(1);
    });

    it("should not fire bookerReady when slots are not loaded", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: false,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      const bookerReadyEvents = firedEvents.filter((e) => e.type === "bookerReady");
      expect(bookerReadyEvents).toHaveLength(0);
    });

    it("should not fire bookerReady when eventId or eventSlug is missing", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: undefined,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      const bookerReadyEvents = firedEvents.filter((e) => e.type === "bookerReady");
      expect(bookerReadyEvents).toHaveLength(0);
    });
  });

  describe("prerendering", () => {
    it("should not fire events during prerendering", () => {
      fakeCurrentDocumentUrl({ params: { prerender: "true" } });
      embedStore.eventsState.viewId = 1;

      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents).toHaveLength(0);
    });
  });

  describe("resetViewVariables", () => {
    it("should reset hasFired flags correctly", () => {
      embedStore.eventsState.bookerViewedFamily.hasFired = true;
      embedStore.eventsState.bookerReady.hasFired = true;

      resetViewVariables();

      expect(embedStore.eventsState.bookerViewedFamily.hasFired).toBe(false);
      expect(embedStore.eventsState.bookerReady.hasFired).toBe(false);
    });

    it("should allow events to fire again after resetViewVariables", () => {
      fakeCurrentDocumentUrl();
      embedStore.eventsState.viewId = 1;

      // First render - events fire
      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents.length).toBeGreaterThan(0);
      firedEvents = [];

      // Reset and increment viewId (simulating new linkReady)
      resetViewVariables();
      embedStore.eventsState.viewId = 2;

      // Second render - events should fire again
      renderHook(() =>
        useBookerEmbedEvents({
          eventId: 123,
          eventSlug: "test-event",
          schedule: {
            isSuccess: true,
            dataUpdatedAt: Date.now(),
          },
        })
      );

      expect(firedEvents.length).toBeGreaterThan(0);
      expect(firedEvents[0].type).toBe("bookerReopened");
    });
  });
});
