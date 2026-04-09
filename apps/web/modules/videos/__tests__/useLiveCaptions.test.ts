import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveCaptions } from "../useLiveCaptions";

/**
 * Mock strategy:
 *
 * useDailyEvent registers handlers for Daily.co call lifecycle events.
 * We capture each handler as it is registered so we can manually fire
 * them in tests — simulating joined-meeting, left-meeting, and
 * transcription-error events without needing a real Daily.co call.
 *
 * trpc.viewer.me.get.useQuery is mocked to return a controlled
 * liveCaptionsEnabled boolean so we can test both enabled and disabled paths.
 */

const mockStartTranscription = vi.fn();
const mockStopTranscription = vi.fn();

const mockDaily = {
  startTranscription: mockStartTranscription,
  stopTranscription: mockStopTranscription,
};

// Captures event handlers registered via useDailyEvent so tests can fire them
const capturedHandlers: Record<string, (...args: unknown[]) => void> = {};

vi.mock("@daily-co/daily-react", () => ({
  useDaily: vi.fn(() => mockDaily),
  useDailyEvent: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    capturedHandlers[event] = handler;
  }),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      me: {
        get: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

// Helper to set the liveCaptionsEnabled return value before each test
const { trpc } = await import("@calcom/trpc/react");
const mockUseQuery = trpc.viewer.me.get.useQuery as ReturnType<typeof vi.fn>;

describe("useLiveCaptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear captured handlers between tests
    for (const key of Object.keys(capturedHandlers)) {
      delete capturedHandlers[key];
    }
  });

  describe("joined-meeting event", () => {
    it("starts transcription with correct params when liveCaptionsEnabled is true", () => {
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: true } });

      renderHook(() => useLiveCaptions());

      // Simulate the Daily.co joined-meeting event
      capturedHandlers["joined-meeting"]?.();

      expect(mockStartTranscription).toHaveBeenCalledTimes(1);
      expect(mockStartTranscription).toHaveBeenCalledWith({
        language: "en",
        model: "nova-2",
        punctuate: true,
      });
    });

    it("does NOT start transcription when liveCaptionsEnabled is false", () => {
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: false } });

      renderHook(() => useLiveCaptions());
      capturedHandlers["joined-meeting"]?.();

      expect(mockStartTranscription).not.toHaveBeenCalled();
    });

    it("does NOT start transcription when liveCaptionsEnabled is undefined", () => {
      mockUseQuery.mockReturnValue({ data: undefined });

      renderHook(() => useLiveCaptions());
      capturedHandlers["joined-meeting"]?.();

      expect(mockStartTranscription).not.toHaveBeenCalled();
    });
  });

  describe("left-meeting event", () => {
    it("stops transcription when liveCaptionsEnabled is true", () => {
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: true } });

      renderHook(() => useLiveCaptions());
      capturedHandlers["left-meeting"]?.();

      expect(mockStopTranscription).toHaveBeenCalledTimes(1);
    });

    it("does NOT stop transcription when liveCaptionsEnabled is false", () => {
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: false } });

      renderHook(() => useLiveCaptions());
      capturedHandlers["left-meeting"]?.();

      expect(mockStopTranscription).not.toHaveBeenCalled();
    });
  });

  describe("transcription-error event", () => {
    it("handles error without throwing and does not crash the call", () => {
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: true } });

      renderHook(() => useLiveCaptions());

      // Must not throw — captions are non-critical and should never crash the call
      expect(() => {
        capturedHandlers["transcription-error"]?.({ errorMsg: "test error" });
      }).not.toThrow();
    });

    it("does not call startTranscription or stopTranscription on error", () => {
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: true } });

      renderHook(() => useLiveCaptions());
      capturedHandlers["transcription-error"]?.({ errorMsg: "test error" });

      expect(mockStartTranscription).not.toHaveBeenCalled();
      expect(mockStopTranscription).not.toHaveBeenCalled();
    });
  });

  describe("when daily call object is not available", () => {
    it("does not throw when daily is null on joined-meeting", async () => {
      const { useDaily } = await import("@daily-co/daily-react");
      (useDaily as ReturnType<typeof vi.fn>).mockReturnValue(null);
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: true } });

      renderHook(() => useLiveCaptions());

      expect(() => {
        capturedHandlers["joined-meeting"]?.();
      }).not.toThrow();
    });

    it("does not throw when daily is null on left-meeting", async () => {
      const { useDaily } = await import("@daily-co/daily-react");
      (useDaily as ReturnType<typeof vi.fn>).mockReturnValue(null);
      mockUseQuery.mockReturnValue({ data: { liveCaptionsEnabled: true } });

      renderHook(() => useLiveCaptions());

      expect(() => {
        capturedHandlers["left-meeting"]?.();
      }).not.toThrow();
    });
  });
});
