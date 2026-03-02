/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  getFeatureOptInTimestamp,
  isFeatureDismissed,
  isFeatureFeedbackShown,
  setFeatureDismissed,
  setFeatureOptedIn,
  setFeatureFeedbackShown,
} from "./feature-opt-in-storage";

vi.mock("@calcom/lib/webstorage", () => {
  const store: Record<string, string> = {};
  return {
    localStorage: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      _store: store,
      _reset: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    },
  };
});

async function getLocalStorageMock() {
  const mod = await import("@calcom/lib/webstorage");
  return mod.localStorage as unknown as {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    _store: Record<string, string>;
    _reset: () => void;
  };
}

describe("feature-opt-in-storage", () => {
  beforeEach(async () => {
    const ls = await getLocalStorageMock();
    ls._reset();
    vi.clearAllMocks();
  });

  describe("isFeatureDismissed / setFeatureDismissed", () => {
    it("returns false for unknown feature", () => {
      expect(isFeatureDismissed("unknown-feature")).toBe(false);
    });

    it("returns true after dismissing a feature", () => {
      setFeatureDismissed("my-feature");
      expect(isFeatureDismissed("my-feature")).toBe(true);
    });

    it("does not affect other features", () => {
      setFeatureDismissed("feature-a");
      expect(isFeatureDismissed("feature-b")).toBe(false);
    });

    it("persists multiple dismissed features", () => {
      setFeatureDismissed("feature-a");
      setFeatureDismissed("feature-b");
      expect(isFeatureDismissed("feature-a")).toBe(true);
      expect(isFeatureDismissed("feature-b")).toBe(true);
    });
  });

  describe("isFeatureFeedbackShown / setFeatureFeedbackShown", () => {
    it("returns false for unknown feature", () => {
      expect(isFeatureFeedbackShown("unknown-feature")).toBe(false);
    });

    it("returns true after marking feedback shown", () => {
      setFeatureFeedbackShown("my-feature");
      expect(isFeatureFeedbackShown("my-feature")).toBe(true);
    });
  });

  describe("setFeatureOptedIn / getFeatureOptInTimestamp", () => {
    it("returns null for unknown feature", () => {
      expect(getFeatureOptInTimestamp("unknown-feature")).toBeNull();
    });

    it("returns a timestamp after opting in", () => {
      const before = Date.now();
      setFeatureOptedIn("my-feature");
      const after = Date.now();
      const timestamp = getFeatureOptInTimestamp("my-feature");
      expect(timestamp).not.toBeNull();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("does not affect other features", () => {
      setFeatureOptedIn("feature-a");
      expect(getFeatureOptInTimestamp("feature-b")).toBeNull();
    });
  });

  describe("handles corrupt localStorage data", () => {
    it("returns false for corrupt dismissed data", async () => {
      const ls = await getLocalStorageMock();
      ls._store["feature-opt-in-dismissed"] = "not-json{{{";
      expect(isFeatureDismissed("any-feature")).toBe(false);
    });

    it("returns false for invalid schema data", async () => {
      const ls = await getLocalStorageMock();
      ls._store["feature-opt-in-dismissed"] = JSON.stringify({ feature: "not-a-boolean" });
      expect(isFeatureDismissed("feature")).toBe(false);
    });

    it("returns null for corrupt opted-in data", async () => {
      const ls = await getLocalStorageMock();
      ls._store["feature-opt-in-enabled"] = "broken";
      expect(getFeatureOptInTimestamp("any-feature")).toBeNull();
    });
  });
});
