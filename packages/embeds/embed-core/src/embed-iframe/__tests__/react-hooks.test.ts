import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sdkActionManager } from "../../sdk-event";
import { embedStore, resetPageData } from "../lib/embedStore";
import { useBookerEmbedEvents } from "../react-hooks";
import { fakeCurrentDocumentUrl } from "./test-utils";

const createTestSchedule = (overrides?: { isSuccess?: boolean; dataUpdatedAt?: number }) => ({
  isSuccess: overrides?.isSuccess ?? true,
  dataUpdatedAt: overrides?.dataUpdatedAt ?? Date.now(),
});

const createTestEventConfig = (overrides?: {
  eventId?: number | undefined;
  eventSlug?: string | undefined;
}) => ({
  eventId: overrides && "eventId" in overrides ? overrides.eventId : 123,
  eventSlug: overrides && "eventSlug" in overrides ? overrides.eventSlug : "test-event",
});

const createTestEmbedState = (overrides?: {
  viewId?: number | null;
  bookerViewedHasFired?: boolean;
  bookerReopenedHasFired?: boolean;
  bookerReloadedHasFired?: boolean;
  bookerReadyHasFired?: boolean;
  reloadInitiated?: boolean;
}) => {
  embedStore.viewId = overrides?.viewId ?? null;
  embedStore.pageData.eventsState.bookerViewed.hasFired = overrides?.bookerViewedHasFired ?? false;
  embedStore.pageData.eventsState.bookerReopened.hasFired = overrides?.bookerReopenedHasFired ?? false;
  embedStore.pageData.eventsState.bookerReloaded.hasFired = overrides?.bookerReloadedHasFired ?? false;
  embedStore.pageData.eventsState.bookerReady.hasFired = overrides?.bookerReadyHasFired ?? false;
  embedStore.pageData.reloadInitiated = overrides?.reloadInitiated ?? false;
};

const expectEventFired = (
  firedEvents: Array<{ type: string; data: unknown }>,
  eventType: string,
  expectedData?: unknown
) => {
  const event = firedEvents.find((e) => e.type === eventType);
  expect(event).toBeDefined();
  if (expectedData) {
    expect(event).toMatchObject({ type: eventType, data: expectedData });
  }
  return event;
};

const expectEventNotFired = (firedEvents: Array<{ type: string; data: unknown }>, eventType: string) => {
  const event = firedEvents.find((e) => e.type === eventType);
  expect(event).toBeUndefined();
};

const expectEventCount = (
  firedEvents: Array<{ type: string; data: unknown }>,
  eventType: string,
  expectedCount: number
) => {
  const events = firedEvents.filter((e) => e.type === eventType);
  expect(events).toHaveLength(expectedCount);
};

describe("useBookerEmbedEvents", () => {
  let firedEvents: Array<{ type: string; data: unknown }> = [];

  beforeEach(() => {
    createTestEmbedState();
    firedEvents = [];

    if (!sdkActionManager) {
      throw new Error("sdkActionManager is not defined");
    }
    vi.spyOn(sdkActionManager, "fire").mockImplementation((type, data) => {
      firedEvents.push({ type, data });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("bookerViewed event", () => {
    it("should fire bookerViewed when first view opens with slots loaded", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents).toHaveLength(2);
      expectEventFired(firedEvents, "bookerViewed", {
        eventId: eventConfig.eventId,
        eventSlug: eventConfig.eventSlug,
        slotsLoaded: true,
      });
    });

    it("should fire bookerViewed when first view opens without slots loaded", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: false });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents).toHaveLength(1);
      expectEventFired(firedEvents, "bookerViewed", {
        eventId: null,
        eventSlug: null,
        slotsLoaded: false,
      });
    });

    it("should fire bookerReopened when embed is reopened after being closed", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 2 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents).toHaveLength(2);
      expectEventFired(firedEvents, "bookerReopened", {
        eventId: eventConfig.eventId,
        eventSlug: eventConfig.eventSlug,
        slotsLoaded: true,
      });
    });

    it("should fire bookerReloaded when reload is initiated", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1, reloadInitiated: true });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents).toHaveLength(2);
      expectEventFired(firedEvents, "bookerReloaded", {
        eventId: eventConfig.eventId,
        eventSlug: eventConfig.eventSlug,
        slotsLoaded: true,
      });
    });

    it("should not fire events multiple times when component rerenders", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      const { rerender } = renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents).toHaveLength(2);

      rerender();
      expect(firedEvents).toHaveLength(2);
    });
  });

  describe("bookerReady event", () => {
    it("should fire bookerReady once per view when slots are loaded", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      const { rerender } = renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expectEventFired(firedEvents, "bookerReady", {
        eventId: eventConfig.eventId,
        eventSlug: eventConfig.eventSlug,
      });

      rerender();
      expectEventCount(firedEvents, "bookerReady", 1);
    });

    it("should not fire bookerReady when slots are not loaded", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: false });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expectEventNotFired(firedEvents, "bookerReady");
    });

    it("should not fire bookerReady when eventId is missing", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig({ eventId: undefined });
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expectEventNotFired(firedEvents, "bookerReady");
    });

    it("should not fire bookerReady when eventSlug is missing", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig({ eventSlug: undefined });
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expectEventNotFired(firedEvents, "bookerReady");
    });
  });

  describe("prerendering", () => {
    it("should not fire events when embed is in prerendering mode", () => {
      fakeCurrentDocumentUrl({ params: { prerender: "true" } });
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents).toHaveLength(0);
    });
  });

  describe("resetPageData", () => {
    it("should reset all page-specific data including hasFired flags", () => {
      createTestEmbedState({
        bookerViewedHasFired: true,
        bookerReopenedHasFired: true,
        bookerReloadedHasFired: true,
        bookerReadyHasFired: true,
        reloadInitiated: true,
      });

      resetPageData();

      expect(embedStore.pageData.eventsState.bookerViewed.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReopened.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReloaded.hasFired).toBe(false);
      expect(embedStore.pageData.eventsState.bookerReady.hasFired).toBe(false);
      expect(embedStore.pageData.reloadInitiated).toBe(false);
    });

    it("should allow events to fire again after reset when new view starts", () => {
      fakeCurrentDocumentUrl();
      createTestEmbedState({ viewId: 1 });

      const eventConfig = createTestEventConfig();
      const schedule = createTestSchedule({ isSuccess: true });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents.length).toBeGreaterThan(0);
      firedEvents = [];

      resetPageData();
      createTestEmbedState({ viewId: 2 });

      renderHook(() => useBookerEmbedEvents({ ...eventConfig, schedule }));

      expect(firedEvents.length).toBeGreaterThan(0);
      expectEventFired(firedEvents, "bookerReopened");
    });
  });
});
