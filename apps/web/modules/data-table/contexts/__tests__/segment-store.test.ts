import type { CombinedFilterSegment, SegmentIdentifier } from "@calcom/features/data-table/lib/types";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { describe, expect, it } from "vitest";
import { createSegmentStore } from "../segment-store";

// ─── Test data ──────────────────────────────────────────────────────────────

const testSegment: CombinedFilterSegment = {
  id: 42,
  name: "Member = Keith",
  type: "user",
  tableIdentifier: "/bookings/upcoming",
  scope: "USER" as const,
  activeFilters: [
    {
      f: "userId",
      v: { type: ColumnFilterType.MULTI_SELECT, data: [101] },
    },
  ],
  sorting: [],
  columnVisibility: {},
  columnSizing: {},
  perPage: 10,
  searchTerm: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 1,
  teamId: null,
  team: null,
};

const testSegmentId: SegmentIdentifier = { id: 42, type: "user" };

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("createSegmentStore", () => {
  describe("initial state", () => {
    it("starts in the initializing phase with no selection", () => {
      const store = createSegmentStore();
      const state = store.getState();

      expect(state.phase).toBe("initializing");
      expect(state.selectedSegment).toBeUndefined();
      expect(state.pendingSegment).toBeNull();
    });

    it("starts in the provided initial phase when specified", () => {
      const store = createSegmentStore("ready");
      const state = store.getState();

      expect(state.phase).toBe("ready");
      expect(state.selectedSegment).toBeUndefined();
      expect(state.pendingSegment).toBeNull();
    });
  });

  describe("markReady", () => {
    it("transitions to ready and clears pending segment", () => {
      const store = createSegmentStore();

      // Set up a pending state first
      store.getState().setPending({ segmentId: testSegmentId, segment: testSegment }, "waitingForValidator");
      expect(store.getState().phase).toBe("waitingForValidator");
      expect(store.getState().pendingSegment).not.toBeNull();

      store.getState().markReady();

      expect(store.getState().phase).toBe("ready");
      expect(store.getState().pendingSegment).toBeNull();
      // selectedSegment should be preserved — markReady only clears pending
      expect(store.getState().selectedSegment).toBe(testSegment);
    });
  });

  describe("setSelected", () => {
    it("sets the selected segment without changing phase", () => {
      const store = createSegmentStore();

      store.getState().setSelected(testSegment);

      expect(store.getState().selectedSegment).toBe(testSegment);
      expect(store.getState().phase).toBe("initializing");
    });

    it("can clear the selected segment", () => {
      const store = createSegmentStore();
      store.getState().setSelected(testSegment);

      store.getState().setSelected(undefined);

      expect(store.getState().selectedSegment).toBeUndefined();
    });
  });

  describe("setPending", () => {
    it("sets pending segment and transitions phase when provided", () => {
      const store = createSegmentStore();
      const pending = { segmentId: testSegmentId, segment: testSegment };

      store.getState().setPending(pending, "waitingForValidator");

      expect(store.getState().pendingSegment).toEqual(pending);
      expect(store.getState().phase).toBe("waitingForValidator");
      expect(store.getState().selectedSegment).toBe(testSegment);
    });

    it("sets pending segment without changing phase when phase is omitted", () => {
      const store = createSegmentStore();
      store.getState().markReady();
      const pending = { segmentId: testSegmentId, segment: testSegment };

      store.getState().setPending(pending);

      expect(store.getState().pendingSegment).toEqual(pending);
      expect(store.getState().phase).toBe("ready");
    });

    it("clears pending segment when null is passed", () => {
      const store = createSegmentStore();
      store.getState().setPending({ segmentId: testSegmentId, segment: testSegment }, "waitingForValidator");

      store.getState().setPending(null, "ready");

      expect(store.getState().pendingSegment).toBeNull();
      expect(store.getState().phase).toBe("ready");
    });
  });

  describe("clearSelection", () => {
    it("resets to ready with no selection and no pending segment", () => {
      const store = createSegmentStore();

      // Build up some state
      store.getState().setPending({ segmentId: testSegmentId, segment: testSegment }, "waitingForValidator");
      expect(store.getState().selectedSegment).toBe(testSegment);

      store.getState().clearSelection();

      expect(store.getState().phase).toBe("ready");
      expect(store.getState().selectedSegment).toBeUndefined();
      expect(store.getState().pendingSegment).toBeNull();
    });
  });

  describe("typical lifecycle", () => {
    it("initializing → waitingForValidator → ready", () => {
      const store = createSegmentStore();

      // Phase 1: initializing
      expect(store.getState().phase).toBe("initializing");

      // Phase 2: segment fetched but validator not ready
      store.getState().setPending({ segmentId: testSegmentId, segment: testSegment }, "waitingForValidator");
      expect(store.getState().phase).toBe("waitingForValidator");
      expect(store.getState().selectedSegment).toBe(testSegment);
      expect(store.getState().pendingSegment).not.toBeNull();

      // Phase 3: validator ready
      store.getState().markReady();
      expect(store.getState().phase).toBe("ready");
      expect(store.getState().selectedSegment).toBe(testSegment);
      expect(store.getState().pendingSegment).toBeNull();
    });

    it("initializing → ready (no segment to apply)", () => {
      const store = createSegmentStore();

      store.getState().markReady();

      expect(store.getState().phase).toBe("ready");
      expect(store.getState().selectedSegment).toBeUndefined();
    });

    it("ready → select → deselect", () => {
      const store = createSegmentStore();
      store.getState().markReady();

      // Select
      store.getState().setSelected(testSegment);
      expect(store.getState().selectedSegment).toBe(testSegment);

      // Deselect
      store.getState().clearSelection();
      expect(store.getState().selectedSegment).toBeUndefined();
      expect(store.getState().phase).toBe("ready");
    });
  });
});
