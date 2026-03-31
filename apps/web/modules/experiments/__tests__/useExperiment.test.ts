import { act, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock tracking before importing the hook
const mockTrackExposure = vi.fn();
const mockTrackOutcome = vi.fn();
vi.mock("@calcom/features/experiments/lib/tracking", () => ({
  trackExperimentExposure: (...args: unknown[]) => mockTrackExposure(...args),
  trackExperimentOutcome: (...args: unknown[]) => mockTrackOutcome(...args),
}));

// Mock localStorage from webstorage (used for anonymous bucketing)
const mockLocalStorage: Record<string, string> = {};
vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: (key: string) => mockLocalStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockLocalStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockLocalStorage[key];
    },
  },
  sessionStorage: {
    getItem: (key: string) => window.sessionStorage.getItem(key),
    setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
    removeItem: (key: string) => window.sessionStorage.removeItem(key),
  },
}));

// Mock config — needs vi.hoisted so it's available at mock definition time
const mockExperiments = vi.hoisted(() => ({
  "upgrade-dialog-try-cta": {
    variants: ["try_cta"],
    target: "logged-in",
  },
}));

vi.mock("@calcom/features/experiments/config", () => ({
  CONTROL_GROUP: "control",
  EXP_OVERRIDE_PREFIX: "exp_override:",
  EXPERIMENTS: mockExperiments,
}));

vi.mock("@calcom/features/experiments/lib/bucketing", () => ({
  assignVariant: vi.fn(() => "try_cta"),
}));

import { ExperimentContext } from "../provider";
import { useExperiment } from "../hooks/useExperiment";

function createWrapper(
  contextValue: { configs: unknown[]; precomputedVariants: Record<string, string | null> | null } | null
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(ExperimentContext.Provider, { value: contextValue as never }, children);
  };
}

describe("useExperiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  describe("logged-in users", () => {
    it("returns precomputed variant from context", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": "try_cta" },
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      expect(result.current.variant).toBe("try_cta");
      expect(result.current.isControl).toBe(false);
    });

    it("returns null (control) when precomputed variant is null", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": null },
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });

    it("returns null when no precomputed variants available", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: null,
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });
  });

  describe("inactive experiment", () => {
    it("returns INACTIVE_RESULT when no context", () => {
      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"));

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });
  });

  describe("exposure tracking", () => {
    it("does NOT auto-track by default", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": "try_cta" },
      });

      renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      expect(mockTrackExposure).not.toHaveBeenCalled();
    });

    it("auto-tracks when trackExposure option is true", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": "try_cta" },
      });

      renderHook(() => useExperiment("upgrade-dialog-try-cta", { trackExposure: true }), { wrapper });

      expect(mockTrackExposure).toHaveBeenCalledWith("upgrade-dialog-try-cta", "try_cta");
    });

    it("trackExposure() fires only once (deduped)", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": "try_cta" },
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      act(() => result.current.trackExposure());
      act(() => result.current.trackExposure());
      act(() => result.current.trackExposure());

      expect(mockTrackExposure).toHaveBeenCalledTimes(1);
    });
  });

  describe("outcome tracking", () => {
    it("trackOutcome fires with correct variant", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": "try_cta" },
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      act(() => result.current.trackOutcome());

      expect(mockTrackOutcome).toHaveBeenCalledWith("upgrade-dialog-try-cta", "try_cta");
    });

    it("trackOutcome fires with null for control group", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": null },
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      act(() => result.current.trackOutcome());

      expect(mockTrackOutcome).toHaveBeenCalledWith("upgrade-dialog-try-cta", null);
    });
  });

  describe("admin preview override", () => {
    afterEach(() => {
      window.sessionStorage.removeItem("exp_override:upgrade-dialog-try-cta");
    });

    it("returns override variant when set in sessionStorage", () => {
      window.sessionStorage.setItem("exp_override:upgrade-dialog-try-cta", "try_cta");

      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": null }, // bucketed as control
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      expect(result.current.variant).toBe("try_cta");
      expect(result.current.isControl).toBe(false);
    });

    it("returns null when override is set to control", () => {
      window.sessionStorage.setItem("exp_override:upgrade-dialog-try-cta", "control");

      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": "try_cta" }, // bucketed as variant
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });

    it("tracking uses override variant, not bucketed variant", () => {
      window.sessionStorage.setItem("exp_override:upgrade-dialog-try-cta", "try_cta");

      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "upgrade-dialog-try-cta": null }, // bucketed as control
      });

      const { result } = renderHook(() => useExperiment("upgrade-dialog-try-cta"), { wrapper });

      act(() => result.current.trackOutcome());

      expect(mockTrackOutcome).toHaveBeenCalledWith("upgrade-dialog-try-cta", "try_cta");
    });
  });
});
