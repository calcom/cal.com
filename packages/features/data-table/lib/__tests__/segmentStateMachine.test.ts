import { evaluateAlwaysTransitions, transition } from "@calcom/lib/stateMachine";
import { describe, expect, it } from "vitest";
import {
  getSegmentId,
  getSelectedSegment,
  initialState,
  isSegmentPending,
  type SegmentEffect,
  type SegmentMachineContext,
  type SegmentMachineEvent,
  type SegmentMachineState,
  segmentMachineConfig,
} from "../segmentStateMachine";
import type { CombinedFilterSegment, SegmentIdentifier } from "../types";

// Test helpers
function createMockUserSegment(id: number, name = "Test Segment"): CombinedFilterSegment {
  return {
    id,
    name,
    tableIdentifier: "test-table",
    type: "user",
    scope: "USER",
    activeFilters: [],
    sorting: [],
    columnVisibility: {},
    columnSizing: {},
    perPage: 25,
    searchTerm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 1,
    teamId: null,
    team: null,
  };
}

function createMockSystemSegment(id: string, name = "System Segment"): CombinedFilterSegment {
  return {
    id,
    name,
    tableIdentifier: "test-table",
    type: "system",
    activeFilters: [],
    sorting: [],
    columnVisibility: {},
    columnSizing: {},
    perPage: 25,
    searchTerm: null,
  };
}

function createFindSegment(segments: CombinedFilterSegment[]) {
  return (id: string) => {
    return segments.find((s) => {
      if (s.type === "system") return s.id === id;
      return s.id === parseInt(id, 10);
    });
  };
}

function createContext(overrides: Partial<SegmentMachineContext> = {}): SegmentMachineContext {
  return {
    isMounted: false,
    segmentIdFromUrl: null,
    isSegmentsFetched: false,
    preferredSegmentId: null,
    findSegment: () => undefined,
    isValidatorReady: false,
    ...overrides,
  };
}

// Helper to run always transitions
function runAlways(
  state: SegmentMachineState,
  context: SegmentMachineContext
): { state: SegmentMachineState; effect: SegmentEffect } {
  const result = evaluateAlwaysTransitions(segmentMachineConfig, state, context);
  return {
    state: result.state,
    effect: result.effect ?? { type: "NONE" },
  };
}

// Helper to send events
function sendEvent(
  state: SegmentMachineState,
  event: SegmentMachineEvent,
  context: SegmentMachineContext = createContext()
): { state: SegmentMachineState; effect: SegmentEffect } {
  const result = transition(segmentMachineConfig, state, event, context);
  return {
    state: result.state,
    effect: result.effect ?? { type: "NONE" },
  };
}

describe("segmentMachineConfig with always transitions", () => {
  describe("initial state", () => {
    it("should start in idle status", () => {
      expect(initialState).toEqual({ status: "idle" });
    });
  });

  describe("idle state", () => {
    it("transitions to waitingForSegments when mounted", () => {
      const state: SegmentMachineState = { status: "idle" };
      const context = createContext({ isMounted: true, segmentIdFromUrl: "123" });

      const result = runAlways(state, context);

      expect(result.state).toEqual({
        status: "waitingForSegments",
        segmentIdFromUrl: "123",
      });
      expect(result.effect).toEqual({ type: "NONE" });
    });

    it("stays in idle when not mounted", () => {
      const state: SegmentMachineState = { status: "idle" };
      const context = createContext({ isMounted: false });

      const result = runAlways(state, context);

      expect(result.state).toEqual(state);
      expect(result.effect).toEqual({ type: "NONE" });
    });

    it("transitions with null segmentIdFromUrl", () => {
      const state: SegmentMachineState = { status: "idle" };
      const context = createContext({ isMounted: true, segmentIdFromUrl: null });

      const result = runAlways(state, context);

      expect(result.state).toEqual({
        status: "waitingForSegments",
        segmentIdFromUrl: null,
      });
    });
  });

  describe("waitingForSegments state", () => {
    describe("when segment is found from URL", () => {
      it("transitions to waitingForValidator when user segment found", () => {
        const segment = createMockUserSegment(123);
        const segments = [segment];
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: "123",
        };
        const context = createContext({
          isSegmentsFetched: true,
          findSegment: createFindSegment(segments),
        });

        const result = runAlways(state, context);

        expect(result.state.status).toBe("waitingForValidator");
        if (result.state.status === "waitingForValidator") {
          expect(result.state.segment).toBe(segment);
          expect(result.state.segmentId).toEqual({ id: 123, type: "user" });
        }
        expect(result.effect).toEqual({ type: "NONE" });
      });

      it("transitions to waitingForValidator when system segment found", () => {
        const segment = createMockSystemSegment("system_test");
        const segments = [segment];
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: "system_test",
        };
        const context = createContext({
          isSegmentsFetched: true,
          findSegment: createFindSegment(segments),
        });

        const result = runAlways(state, context);

        expect(result.state.status).toBe("waitingForValidator");
        if (result.state.status === "waitingForValidator") {
          expect(result.state.segment).toBe(segment);
          expect(result.state.segmentId).toEqual({ id: "system_test", type: "system" });
        }
        expect(result.effect).toEqual({ type: "NONE" });
      });
    });

    describe("when using preferred segment", () => {
      it("uses preferred segment when no URL segment", () => {
        const segment = createMockUserSegment(456);
        const segments = [segment];
        const preferredSegmentId: SegmentIdentifier = { id: 456, type: "user" };
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: null,
        };
        const context = createContext({
          isSegmentsFetched: true,
          preferredSegmentId,
          findSegment: createFindSegment(segments),
        });

        const result = runAlways(state, context);

        expect(result.state.status).toBe("waitingForValidator");
        if (result.state.status === "waitingForValidator") {
          expect(result.state.segment).toBe(segment);
          expect(result.state.segmentId).toBe(preferredSegmentId);
        }
        expect(result.effect).toEqual({ type: "NONE" });
      });

      it("URL segment takes priority over preferred segment", () => {
        const urlSegment = createMockUserSegment(123);
        const preferredSegment = createMockUserSegment(456);
        const segments = [urlSegment, preferredSegment];
        const preferredSegmentId: SegmentIdentifier = { id: 456, type: "user" };
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: "123",
        };
        const context = createContext({
          isSegmentsFetched: true,
          preferredSegmentId,
          findSegment: createFindSegment(segments),
        });

        const result = runAlways(state, context);

        expect(result.state.status).toBe("waitingForValidator");
        if (result.state.status === "waitingForValidator") {
          expect(result.state.segment).toBe(urlSegment);
          expect(result.state.segmentId).toEqual({ id: 123, type: "user" });
        }
      });
    });

    describe("when no segment to apply", () => {
      it("transitions to ready when no URL segment and no preferred segment", () => {
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: null,
        };
        const context = createContext({
          isSegmentsFetched: true,
          findSegment: () => undefined,
        });

        const result = runAlways(state, context);

        expect(result.state).toEqual({
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        });
        expect(result.effect).toEqual({ type: "NONE" });
      });

      it("transitions to ready when URL segment not found in segments list", () => {
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: "999",
        };
        const context = createContext({
          isSegmentsFetched: true,
          findSegment: () => undefined,
        });

        const result = runAlways(state, context);

        expect(result.state).toEqual({
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        });
      });

      it("transitions to ready when preferred segment not found", () => {
        const preferredSegmentId: SegmentIdentifier = { id: 999, type: "user" };
        const state: SegmentMachineState = {
          status: "waitingForSegments",
          segmentIdFromUrl: null,
        };
        const context = createContext({
          isSegmentsFetched: true,
          preferredSegmentId,
          findSegment: () => undefined,
        });

        const result = runAlways(state, context);

        expect(result.state).toEqual({
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        });
      });
    });

    it("stays in waitingForSegments when segments not fetched", () => {
      const state: SegmentMachineState = {
        status: "waitingForSegments",
        segmentIdFromUrl: "123",
      };
      const context = createContext({ isSegmentsFetched: false });

      const result = runAlways(state, context);

      expect(result.state).toEqual(state);
      expect(result.effect).toEqual({ type: "NONE" });
    });
  });

  describe("waitingForValidator state", () => {
    it("transitions to applying when validator ready and emits APPLY_FILTERS effect", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      const state: SegmentMachineState = {
        status: "waitingForValidator",
        segment,
        segmentId,
      };
      const context = createContext({ isValidatorReady: true });

      const result = runAlways(state, context);

      expect(result.state).toEqual({
        status: "applying",
        segment,
        segmentId,
      });
      expect(result.effect).toEqual({
        type: "APPLY_FILTERS",
        segment,
        segmentId,
      });
    });

    it("stays in waitingForValidator when validator not ready", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      const state: SegmentMachineState = {
        status: "waitingForValidator",
        segment,
        segmentId,
      };
      const context = createContext({ isValidatorReady: false });

      const result = runAlways(state, context);

      expect(result.state).toEqual(state);
      expect(result.effect).toEqual({ type: "NONE" });
    });
  });

  describe("applying state", () => {
    it("immediately transitions to ready", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      const state: SegmentMachineState = {
        status: "applying",
        segment,
        segmentId,
      };
      const context = createContext();

      const result = runAlways(state, context);

      expect(result.state).toEqual({
        status: "ready",
        selectedSegment: segment,
        segmentId,
      });
      expect(result.effect).toEqual({ type: "NONE" });
    });
  });

  describe("ready state - event-triggered transitions", () => {
    describe("SELECT_SEGMENT", () => {
      it("transitions to waitingForValidator when selecting a segment", () => {
        const segment = createMockUserSegment(456);
        const segmentId: SegmentIdentifier = { id: 456, type: "user" };
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        };
        const event: SegmentMachineEvent = {
          type: "SELECT_SEGMENT",
          segmentId,
          segment,
        };

        const result = sendEvent(state, event);

        expect(result.state).toEqual({
          status: "waitingForValidator",
          segment,
          segmentId,
        });
        expect(result.effect).toEqual({ type: "NONE" });
      });

      it("transitions to waitingForValidator when switching segments", () => {
        const oldSegment = createMockUserSegment(123);
        const newSegment = createMockUserSegment(456);
        const oldSegmentId: SegmentIdentifier = { id: 123, type: "user" };
        const newSegmentId: SegmentIdentifier = { id: 456, type: "user" };
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: oldSegment,
          segmentId: oldSegmentId,
        };
        const event: SegmentMachineEvent = {
          type: "SELECT_SEGMENT",
          segmentId: newSegmentId,
          segment: newSegment,
        };

        const result = sendEvent(state, event);

        expect(result.state).toEqual({
          status: "waitingForValidator",
          segment: newSegment,
          segmentId: newSegmentId,
        });
      });
    });

    describe("CLEAR_SEGMENT", () => {
      it("clears the segment and emits CLEAR_URL_AND_PREFERENCE effect", () => {
        const segment = createMockUserSegment(123);
        const segmentId: SegmentIdentifier = { id: 123, type: "user" };
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: segment,
          segmentId,
        };
        const event: SegmentMachineEvent = { type: "CLEAR_SEGMENT" };

        const result = sendEvent(state, event);

        expect(result.state).toEqual({
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        });
        expect(result.effect).toEqual({ type: "CLEAR_URL_AND_PREFERENCE" });
      });

      it("handles clearing when already null", () => {
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        };
        const event: SegmentMachineEvent = { type: "CLEAR_SEGMENT" };

        const result = sendEvent(state, event);

        expect(result.state).toEqual({
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        });
        expect(result.effect).toEqual({ type: "CLEAR_URL_AND_PREFERENCE" });
      });
    });

    describe("CLEAR_SYSTEM_SEGMENT", () => {
      it("clears system segment selection and emits effect", () => {
        const segment = createMockSystemSegment("system_test");
        const segmentId: SegmentIdentifier = { id: "system_test", type: "system" };
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: segment,
          segmentId,
        };
        const event: SegmentMachineEvent = { type: "CLEAR_SYSTEM_SEGMENT" };

        const result = sendEvent(state, event);

        expect(result.state).toEqual({
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        });
        expect(result.effect).toEqual({ type: "CLEAR_URL_AND_PREFERENCE" });
      });

      it("does not clear user segment selection", () => {
        const segment = createMockUserSegment(123);
        const segmentId: SegmentIdentifier = { id: 123, type: "user" };
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: segment,
          segmentId,
        };
        const event: SegmentMachineEvent = { type: "CLEAR_SYSTEM_SEGMENT" };

        const result = sendEvent(state, event);

        expect(result.state).toEqual(state);
        expect(result.effect).toEqual({ type: "NONE" });
      });

      it("handles clearing when no segment selected", () => {
        const state: SegmentMachineState = {
          status: "ready",
          selectedSegment: null,
          segmentId: null,
        };
        const event: SegmentMachineEvent = { type: "CLEAR_SYSTEM_SEGMENT" };

        const result = sendEvent(state, event);

        expect(result.state).toEqual(state);
        expect(result.effect).toEqual({ type: "NONE" });
      });
    });
  });
});

describe("helper functions", () => {
  describe("isSegmentPending", () => {
    it("returns false for idle state", () => {
      expect(isSegmentPending({ status: "idle" })).toBe(false);
    });

    it("returns false for waitingForSegments state", () => {
      expect(isSegmentPending({ status: "waitingForSegments", segmentIdFromUrl: null })).toBe(false);
    });

    it("returns true for waitingForValidator state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        isSegmentPending({
          status: "waitingForValidator",
          segment,
          segmentId,
        })
      ).toBe(true);
    });

    it("returns true for applying state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        isSegmentPending({
          status: "applying",
          segment,
          segmentId,
        })
      ).toBe(true);
    });

    it("returns false for ready state", () => {
      expect(isSegmentPending({ status: "ready", selectedSegment: null, segmentId: null })).toBe(false);
    });
  });

  describe("getSelectedSegment", () => {
    it("returns null for idle state", () => {
      expect(getSelectedSegment({ status: "idle" })).toBeNull();
    });

    it("returns null for waitingForSegments state", () => {
      expect(getSelectedSegment({ status: "waitingForSegments", segmentIdFromUrl: null })).toBeNull();
    });

    it("returns segment for waitingForValidator state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        getSelectedSegment({
          status: "waitingForValidator",
          segment,
          segmentId,
        })
      ).toBe(segment);
    });

    it("returns segment for applying state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        getSelectedSegment({
          status: "applying",
          segment,
          segmentId,
        })
      ).toBe(segment);
    });

    it("returns selectedSegment for ready state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        getSelectedSegment({
          status: "ready",
          selectedSegment: segment,
          segmentId,
        })
      ).toBe(segment);
    });

    it("returns null for ready state with no segment", () => {
      expect(getSelectedSegment({ status: "ready", selectedSegment: null, segmentId: null })).toBeNull();
    });
  });

  describe("getSegmentId", () => {
    it("returns null for idle state", () => {
      expect(getSegmentId({ status: "idle" })).toBeNull();
    });

    it("returns null for waitingForSegments state", () => {
      expect(getSegmentId({ status: "waitingForSegments", segmentIdFromUrl: null })).toBeNull();
    });

    it("returns segmentId for waitingForValidator state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        getSegmentId({
          status: "waitingForValidator",
          segment,
          segmentId,
        })
      ).toBe(segmentId);
    });

    it("returns segmentId for applying state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        getSegmentId({
          status: "applying",
          segment,
          segmentId,
        })
      ).toBe(segmentId);
    });

    it("returns segmentId for ready state", () => {
      const segment = createMockUserSegment(123);
      const segmentId: SegmentIdentifier = { id: 123, type: "user" };
      expect(
        getSegmentId({
          status: "ready",
          selectedSegment: segment,
          segmentId,
        })
      ).toBe(segmentId);
    });

    it("returns null for ready state with no segment", () => {
      expect(getSegmentId({ status: "ready", selectedSegment: null, segmentId: null })).toBeNull();
    });
  });
});
