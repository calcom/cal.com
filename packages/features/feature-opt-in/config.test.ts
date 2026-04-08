import { describe, expect, it } from "vitest";

import {
  getOptInFeatureConfig,
  getOptInFeaturesForScope,
  isFeatureAllowedForScope,
  isOptInFeature,
  OPT_IN_FEATURES,
  shouldDisplayFeatureAt,
} from "./config";

describe("getOptInFeatureConfig", () => {
  it("returns config for known feature slug", () => {
    const config = getOptInFeatureConfig("bookings-v3");
    expect(config).toBeDefined();
    expect(config?.slug).toBe("bookings-v3");
  });

  it("returns undefined for unknown feature slug", () => {
    expect(getOptInFeatureConfig("nonexistent-feature")).toBeUndefined();
  });
});

describe("isOptInFeature", () => {
  it("returns true for known feature slug", () => {
    expect(isOptInFeature("bookings-v3")).toBe(true);
  });

  it("returns false for unknown feature slug", () => {
    expect(isOptInFeature("nonexistent-feature")).toBe(false);
  });
});

describe("shouldDisplayFeatureAt", () => {
  it("returns true when feature has matching display location", () => {
    const feature = OPT_IN_FEATURES.find((f) => f.slug === "bookings-v3");
    expect(feature).toBeDefined();
    if (feature) {
      expect(shouldDisplayFeatureAt(feature, "settings")).toBe(true);
      expect(shouldDisplayFeatureAt(feature, "banner")).toBe(true);
    }
  });

  it("defaults to settings when displayLocations is not specified", () => {
    const featureWithoutLocations = {
      slug: "test-feature" as const,
      i18n: { title: "t", name: "n", description: "d" },
      bannerImage: { src: "/test.png", width: 100, height: 100 },
      policy: "permissive" as const,
    };
    expect(shouldDisplayFeatureAt(featureWithoutLocations, "settings")).toBe(true);
    expect(shouldDisplayFeatureAt(featureWithoutLocations, "banner")).toBe(false);
  });
});

describe("getOptInFeaturesForScope", () => {
  it("returns features for user scope", () => {
    const features = getOptInFeaturesForScope("user");
    expect(features.length).toBeGreaterThanOrEqual(0);
    for (const f of features) {
      expect(!f.scope || f.scope.includes("user")).toBe(true);
    }
  });

  it("returns features for team scope", () => {
    const features = getOptInFeaturesForScope("team");
    expect(features.length).toBeGreaterThanOrEqual(0);
    for (const f of features) {
      expect(!f.scope || f.scope.includes("team")).toBe(true);
    }
  });

  it("returns features for org scope", () => {
    const features = getOptInFeaturesForScope("org");
    expect(features.length).toBeGreaterThanOrEqual(0);
    for (const f of features) {
      expect(!f.scope || f.scope.includes("org")).toBe(true);
    }
  });

  it("filters by display location when specified", () => {
    const settingsFeatures = getOptInFeaturesForScope("user", "settings");
    const bannerFeatures = getOptInFeaturesForScope("user", "banner");
    for (const f of settingsFeatures) {
      expect(shouldDisplayFeatureAt(f, "settings")).toBe(true);
    }
    for (const f of bannerFeatures) {
      expect(shouldDisplayFeatureAt(f, "banner")).toBe(true);
    }
  });
});

describe("isFeatureAllowedForScope", () => {
  it("returns true for bookings-v3 with user scope", () => {
    expect(isFeatureAllowedForScope("bookings-v3", "user")).toBe(true);
  });

  it("returns true for bookings-v3 with team scope", () => {
    expect(isFeatureAllowedForScope("bookings-v3", "team")).toBe(true);
  });

  it("returns true for bookings-v3 with org scope", () => {
    expect(isFeatureAllowedForScope("bookings-v3", "org")).toBe(true);
  });

  it("returns false for unknown feature slug", () => {
    expect(isFeatureAllowedForScope("nonexistent", "user")).toBe(false);
  });
});

describe("OPT_IN_FEATURES", () => {
  it("contains at least one feature", () => {
    expect(OPT_IN_FEATURES.length).toBeGreaterThan(0);
  });

  it("all features have required fields", () => {
    for (const feature of OPT_IN_FEATURES) {
      expect(feature.slug).toBeDefined();
      expect(feature.i18n.title).toBeDefined();
      expect(feature.i18n.name).toBeDefined();
      expect(feature.i18n.description).toBeDefined();
      expect(feature.bannerImage.src).toBeDefined();
      expect(feature.policy).toBeDefined();
    }
  });
});
