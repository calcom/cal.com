import { describe, expect, it } from "vitest";
import { FeatureDtoArraySchema, FeatureDtoSchema } from "./FeatureDto";

describe("FeatureDtoSchema", () => {
  const validFeature = {
    slug: "test-feature",
    enabled: true,
    description: "A test feature",
    type: "RELEASE" as const,
    stale: false,
    lastUsedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: 1,
  };

  it("parses a valid feature", () => {
    const result = FeatureDtoSchema.safeParse(validFeature);
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields as null", () => {
    const result = FeatureDtoSchema.safeParse({
      ...validFeature,
      description: null,
      type: null,
      stale: null,
      lastUsedAt: null,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    });
    expect(result.success).toBe(true);
  });

  it("coerces date strings to Date objects", () => {
    const result = FeatureDtoSchema.parse(validFeature);
    expect(result.lastUsedAt).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects missing required slug", () => {
    const { slug: _, ...noSlug } = validFeature;
    const result = FeatureDtoSchema.safeParse(noSlug);
    expect(result.success).toBe(false);
  });

  it("rejects missing required enabled", () => {
    const { enabled: _, ...noEnabled } = validFeature;
    const result = FeatureDtoSchema.safeParse(noEnabled);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type enum value", () => {
    const result = FeatureDtoSchema.safeParse({ ...validFeature, type: "INVALID_TYPE" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid type enum values", () => {
    const types = ["RELEASE", "EXPERIMENT", "OPERATIONAL", "PERMISSION", "KILL_SWITCH"];
    for (const type of types) {
      const result = FeatureDtoSchema.safeParse({ ...validFeature, type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects wrong types for fields", () => {
    expect(FeatureDtoSchema.safeParse({ ...validFeature, slug: 123 }).success).toBe(false);
    expect(FeatureDtoSchema.safeParse({ ...validFeature, enabled: "yes" }).success).toBe(false);
    expect(FeatureDtoSchema.safeParse({ ...validFeature, updatedBy: "not-a-number" }).success).toBe(false);
  });
});

describe("FeatureDtoArraySchema", () => {
  it("parses an array of valid features", () => {
    const features = [
      {
        slug: "feature-1",
        enabled: true,
        description: null,
        type: null,
        stale: null,
        lastUsedAt: null,
        createdAt: null,
        updatedAt: null,
        updatedBy: null,
      },
      {
        slug: "feature-2",
        enabled: false,
        description: "Second feature",
        type: "EXPERIMENT" as const,
        stale: true,
        lastUsedAt: "2024-06-01T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        updatedBy: 2,
      },
    ];
    const result = FeatureDtoArraySchema.safeParse(features);
    expect(result.success).toBe(true);
  });

  it("parses an empty array", () => {
    const result = FeatureDtoArraySchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("rejects if any element is invalid", () => {
    const features = [
      {
        slug: "valid",
        enabled: true,
        description: null,
        type: null,
        stale: null,
        lastUsedAt: null,
        createdAt: null,
        updatedAt: null,
        updatedBy: null,
      },
      { invalid: true },
    ];
    const result = FeatureDtoArraySchema.safeParse(features);
    expect(result.success).toBe(false);
  });
});
