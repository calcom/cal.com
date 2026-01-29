import type { MachineConfig } from "@calcom/lib/stateMachine";
import type { CombinedFilterSegment, SegmentIdentifier } from "./types";

/**
 * Segment State Machine Definition
 *
 * Manages the lifecycle of filter segment selection and application.
 * Uses "always" transitions to automatically progress when external conditions are met.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           STATE DIAGRAM                                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 *      ┌───────────┐
 *      │   idle    │
 *      └─────┬─────┘
 *            │ always [mounted]
 *            ▼
 *      ┌─────────────────────────┐
 *      │   waitingForSegments    │
 *      │  (segmentIdFromUrl)     │
 *      └─────────────┬───────────┘
 *                    │ always [isSegmentsFetched]
 *                    │
 *        ┌───────────┴───────────┐
 *        │ [segment found]       │ [no segment]
 *        ▼                       │
 *      ┌─────────────────────────┐         │
 *      │  waitingForValidator    │         │
 *      │  (segment, segmentId)   │         │
 *      └─────────────┬───────────┘         │
 *                    │ always              │
 *                    │ [isValidatorReady]  │
 *                    ▼                     │
 *      ┌─────────────────────────┐         │
 *      │       applying          │         │
 *      │  (segment, segmentId)   │         │
 *      │  >> APPLY_FILTERS       │         │
 *      └─────────────┬───────────┘         │
 *                    │ always [immediate]  │
 *                    ▼                     │
 *      ┌─────────────────────────┐         │
 *      │         ready           │◄────────┘
 *      │  (selectedSegment,      │
 *      │   segmentId)            │
 *      └─────────────────────────┘
 *                    │
 *        ┌───────────┼───────────────────────────┐
 *        │           │                           │
 *        │ SELECT_   │ CLEAR_                    │ CLEAR_SYSTEM_
 *        │ SEGMENT   │ SEGMENT                   │ SEGMENT
 *        │           │                           │ [if system segment]
 *        │           ▼                           ▼
 *        │      ┌─────────┐                 ┌─────────┐
 *        │      │  ready  │                 │  ready  │
 *        │      │ (null)  │                 │ (null)  │
 *        │      │ >> CLEAR│                 │ >> CLEAR│
 *        │      └─────────┘                 └─────────┘
 *        │
 *        └──► waitingForValidator
 *
 * Legend:
 *   ──►     Transition
 *   >>      Effect (side effect executed on transition)
 *   [ ]     Guard condition
 *   always  Auto-transition when when passes
 */

// ============================================================================
// Context Type (external data that drives auto-transitions)
// ============================================================================

export type SegmentMachineContext = {
  /** Whether the component has mounted (triggers initial transition) */
  isMounted: boolean;
  /** Segment ID from URL (used during initialization) */
  segmentIdFromUrl: string | null;
  /** Whether segments have been fetched from the server */
  isSegmentsFetched: boolean;
  /** User's preferred segment from storage */
  preferredSegmentId: SegmentIdentifier | null;
  /** Function to find a segment by ID */
  findSegment: (id: string) => CombinedFilterSegment | undefined;
  /** Whether the filter validator is ready */
  isValidatorReady: boolean;
};

// ============================================================================
// State Types
// ============================================================================

export type SegmentMachineState =
  | { status: "idle" }
  | { status: "waitingForSegments"; segmentIdFromUrl: string | null }
  | { status: "waitingForValidator"; segment: CombinedFilterSegment; segmentId: SegmentIdentifier }
  | { status: "applying"; segment: CombinedFilterSegment; segmentId: SegmentIdentifier }
  | {
      status: "ready";
      selectedSegment: CombinedFilterSegment | null;
      segmentId: SegmentIdentifier | null;
    };

// ============================================================================
// Event Types (user-triggered actions only)
// ============================================================================

export type SegmentMachineEvent =
  | { type: "SELECT_SEGMENT"; segmentId: SegmentIdentifier; segment: CombinedFilterSegment }
  | { type: "CLEAR_SEGMENT" }
  | { type: "CLEAR_SYSTEM_SEGMENT" };

// ============================================================================
// Effect Types
// ============================================================================

export type SegmentEffect =
  | { type: "APPLY_FILTERS"; segment: CombinedFilterSegment; segmentId: SegmentIdentifier }
  | { type: "CLEAR_URL_AND_PREFERENCE" }
  | { type: "NONE" };

// ============================================================================
// Initial State
// ============================================================================

export const initialState: SegmentMachineState = { status: "idle" };

// ============================================================================
// Machine Configuration
// ============================================================================

export const segmentMachineConfig: MachineConfig<
  SegmentMachineState,
  SegmentMachineEvent,
  SegmentEffect,
  SegmentMachineContext
> = {
  idle: {
    always: [
      {
        target: "waitingForSegments",
        match: (_state, context) =>
          context.isMounted ? { segmentIdFromUrl: context.segmentIdFromUrl } : null,
      },
    ],
  },

  waitingForSegments: {
    always: [
      // When segments are fetched and a segment is found -> waitingForValidator
      {
        target: "waitingForValidator",
        match: (state, context) => {
          if (!context.isSegmentsFetched) return null;

          const { segmentIdFromUrl } = state;
          const { preferredSegmentId, findSegment } = context;

          if (segmentIdFromUrl) {
            const segment = findSegment(segmentIdFromUrl);
            if (!segment) return null;
            return { segment, segmentId: getSegmentIdentifier(segmentIdFromUrl, segment) };
          }
          if (preferredSegmentId) {
            const segment = findSegment(String(preferredSegmentId.id));
            if (!segment) return null;
            return { segment, segmentId: preferredSegmentId };
          }
          return null;
        },
      },
      // When segments are fetched but no segment found -> ready
      {
        target: "ready",
        match: (_state, context) =>
          context.isSegmentsFetched ? { selectedSegment: null, segmentId: null } : null,
      },
    ],
  },

  waitingForValidator: {
    always: [
      {
        target: "applying",
        match: (state, context) =>
          context.isValidatorReady ? { segment: state.segment, segmentId: state.segmentId } : null,
        effect: (state) => ({
          type: "APPLY_FILTERS",
          segment: state.segment,
          segmentId: state.segmentId,
        }),
      },
    ],
  },

  applying: {
    always: [
      // Immediately transition to ready after applying
      {
        target: "ready",
        match: (state) => ({ selectedSegment: state.segment, segmentId: state.segmentId }),
      },
    ],
  },

  ready: {
    on: {
      SELECT_SEGMENT: {
        target: "waitingForValidator",
        match: (_state, event) => ({ segment: event.segment, segmentId: event.segmentId }),
      },
      CLEAR_SEGMENT: {
        target: "ready",
        match: () => ({ selectedSegment: null, segmentId: null }),
        effect: () => ({ type: "CLEAR_URL_AND_PREFERENCE" }),
      },
      CLEAR_SYSTEM_SEGMENT: [
        // Only clear if system segment is selected
        {
          target: "ready",
          match: (state) =>
            state.selectedSegment?.type === "system" ? { selectedSegment: null, segmentId: null } : null,
          effect: () => ({ type: "CLEAR_URL_AND_PREFERENCE" }),
        },
        // Otherwise, stay in ready (no-op)
        {
          target: "ready",
          match: (state) => ({ selectedSegment: state.selectedSegment, segmentId: state.segmentId }),
        },
      ],
    },
  },
};

// ============================================================================
// Helpers
// ============================================================================

function getSegmentIdentifier(rawId: string, segment: CombinedFilterSegment): SegmentIdentifier {
  if (segment.type === "system") {
    return { id: rawId, type: "system" };
  }
  return { id: parseInt(rawId, 10), type: "user" };
}

export function isSegmentPending(state: SegmentMachineState): boolean {
  return state.status === "waitingForValidator" || state.status === "applying";
}

export function getSelectedSegment(state: SegmentMachineState): CombinedFilterSegment | null {
  if (state.status === "ready") {
    return state.selectedSegment;
  }
  if (state.status === "waitingForValidator" || state.status === "applying") {
    return state.segment;
  }
  return null;
}

export function getSegmentId(state: SegmentMachineState): SegmentIdentifier | null {
  if (state.status === "ready") {
    return state.segmentId;
  }
  if (state.status === "waitingForValidator" || state.status === "applying") {
    return state.segmentId;
  }
  return null;
}
