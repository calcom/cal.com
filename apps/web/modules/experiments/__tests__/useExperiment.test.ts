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
}));

// Mock config — needs vi.hoisted so it's available at mock definition time
const mockExperiments = vi.hoisted(() => ({
  "billing-upgrade-cta": {
    variants: ["upgrade_button"],
    target: "logged-in",
  },
}));

vi.mock("@calcom/features/experiments/config", () => ({
  CONTROL_GROUP: "control",
  EXP_OVERRIDE_PREFIX: "exp_override:",
  EXPERIMENTS: mockExperiments,
}));

vi.mock("@calcom/features/experiments/lib/bucketing", () => ({
  assignVariant: vi.fn(() => "upgrade_button"),
}));

import { ExperimentContext } from "../provider";
import { useExperiment } from "../hooks/useExperiment";

function createWrapper(contextValue: { configs: unknown[]; precomputedVariants: Record<string, string | null> | null } | null) {
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
        precomputedVariants: { "billing-upgrade-cta": "upgrade_button" },
      });

      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

      expect(result.current.variant).toBe("upgrade_button");
      expect(result.current.isControl).toBe(false);
    });

    it("returns null (control) when precomputed variant is null", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "billing-upgrade-cta": null },
      });

      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });

    it("returns null when no precomputed variants available", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: null,
      });

      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });
  });

  describe("inactive experiment", () => {
    it("returns INACTIVE_RESULT when no context", () => {
      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"));

      expect(result.current.variant).toBeNull();
      expect(result.current.isControl).toBe(true);
    });
  });

  describe("exposure tracking", () => {
    it("does NOT auto-track by default", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "billing-upgrade-cta": "upgrade_button" },
      });

      renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

      expect(mockTrackExposure).not.toHaveBeenCalled();
    });

    it("auto-tracks when trackExposure option is true", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "billing-upgrade-cta": "upgrade_button" },
      });

      renderHook(() => useExperiment("billing-upgrade-cta", { trackExposure: true }), { wrapper });

      expect(mockTrackExposure).toHaveBeenCalledWith("billing-upgrade-cta", "upgrade_button");
    });

    it("trackExposure() fires only once (deduped)", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "billing-upgrade-cta": "upgrade_button" },
      });

      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

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
        precomputedVariants: { "billing-upgrade-cta": "upgrade_button" },
      });

      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

      act(() => result.current.trackOutcome());

      expect(mockTrackOutcome).toHaveBeenCalledWith("billing-upgrade-cta", "upgrade_button");
    });

    it("trackOutcome fires with null for control group", () => {
      const wrapper = createWrapper({
        configs: [],
        precomputedVariants: { "billing-upgrade-cta": null },
      });

      const { result } = renderHook(() => useExperiment("billing-upgrade-cta"), { wrapper });

      act(() => result.current.trackOutcome());

      expect(mockTrackOutcome).toHaveBeenCalledWith("billing-upgrade-cta", null);
    });
  });

  // Admin preview override tests live in PR #342 where the override logic is introduced.
});
