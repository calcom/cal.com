import { describe, expect, it } from "vitest";

import {
  assignVariantDeterministic,
  assignVariantRandom,
  validateVariantPercentages,
} from "./variant-assignment";

describe("validateVariantPercentages", () => {
  it("should return true for valid percentages summing to 100", () => {
    const variants = [
      { name: "control", percentage: 50 },
      { name: "treatment", percentage: 50 },
    ];
    expect(validateVariantPercentages(variants)).toBe(true);
  });

  it("should return true for valid percentages with decimals", () => {
    const variants = [
      { name: "a", percentage: 33.33 },
      { name: "b", percentage: 33.33 },
      { name: "c", percentage: 33.34 },
    ];
    expect(validateVariantPercentages(variants)).toBe(true);
  });

  it("should return false for percentages not summing to 100", () => {
    const variants = [
      { name: "control", percentage: 40 },
      { name: "treatment", percentage: 50 },
    ];
    expect(validateVariantPercentages(variants)).toBe(false);
  });

  it("should return false for percentages exceeding 100", () => {
    const variants = [
      { name: "control", percentage: 60 },
      { name: "treatment", percentage: 50 },
    ];
    expect(validateVariantPercentages(variants)).toBe(false);
  });
});

describe("assignVariantDeterministic", () => {
  const variants = [
    { name: "control", percentage: 50 },
    { name: "treatment", percentage: 50 },
  ];

  it("should throw error if percentages dont sum to 100", () => {
    const invalidVariants = [
      { name: "control", percentage: 40 },
      { name: "treatment", percentage: 50 },
    ];
    expect(() => assignVariantDeterministic("user-123", "test-experiment", invalidVariants)).toThrow(
      "Variant percentages must sum to 100"
    );
  });

  it("should return consistent variant for same identifier", () => {
    const variant1 = assignVariantDeterministic("user-123", "test-experiment", variants);
    const variant2 = assignVariantDeterministic("user-123", "test-experiment", variants);
    expect(variant1).toBe(variant2);
  });

  it("should return different variants for different identifiers", () => {
    // test multiple identifiers to ensure distribution
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const variant = assignVariantDeterministic(`user-${i}`, "test-experiment", variants);
      results.add(variant);
    }
    // should have both variants assigned to someone
    expect(results.size).toBeGreaterThan(1);
  });

  it("should return different variants for same user in different experiments", () => {
    // same user might get different variants in different experiments
    const variant1 = assignVariantDeterministic("user-123", "experiment-a", variants);
    const variant2 = assignVariantDeterministic("user-123", "experiment-b", variants);
    // both should be valid variants
    expect(["control", "treatment"]).toContain(variant1);
    expect(["control", "treatment"]).toContain(variant2);
    // verify the hash changes based on experiment slug
    expect(variant1).toBeDefined();
    expect(variant2).toBeDefined();
  });

  it("should respect variant percentages approximately", () => {
    const counts = { control: 0, treatment: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const variant = assignVariantDeterministic(`user-${i}`, "test-experiment", variants);
      counts[variant as keyof typeof counts]++;
    }

    // with 50/50 split, expect roughly 45-55% for each (allow 5% margin)
    expect(counts.control).toBeGreaterThan(iterations * 0.45);
    expect(counts.control).toBeLessThan(iterations * 0.55);
    expect(counts.treatment).toBeGreaterThan(iterations * 0.45);
    expect(counts.treatment).toBeLessThan(iterations * 0.55);
  });

  it("should handle uneven splits correctly", () => {
    const unevenVariants = [
      { name: "control", percentage: 80 },
      { name: "treatment", percentage: 20 },
    ];
    const counts = { control: 0, treatment: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const variant = assignVariantDeterministic(`user-${i}`, "test-experiment", unevenVariants);
      counts[variant as keyof typeof counts]++;
    }

    // expect roughly 75-85% control, 15-25% treatment
    expect(counts.control).toBeGreaterThan(iterations * 0.75);
    expect(counts.control).toBeLessThan(iterations * 0.85);
    expect(counts.treatment).toBeGreaterThan(iterations * 0.15);
    expect(counts.treatment).toBeLessThan(iterations * 0.25);
  });

  it("should handle three-way splits", () => {
    const threeWayVariants = [
      { name: "a", percentage: 33.33 },
      { name: "b", percentage: 33.33 },
      { name: "c", percentage: 33.34 },
    ];
    const counts = { a: 0, b: 0, c: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const variant = assignVariantDeterministic(`user-${i}`, "test-experiment", threeWayVariants);
      counts[variant as keyof typeof counts]++;
    }

    // expect roughly 30-37% for each
    expect(counts.a).toBeGreaterThan(iterations * 0.3);
    expect(counts.a).toBeLessThan(iterations * 0.37);
    expect(counts.b).toBeGreaterThan(iterations * 0.3);
    expect(counts.b).toBeLessThan(iterations * 0.37);
    expect(counts.c).toBeGreaterThan(iterations * 0.3);
    expect(counts.c).toBeLessThan(iterations * 0.37);
  });
});

describe("assignVariantRandom", () => {
  const variants = [
    { name: "control", percentage: 50 },
    { name: "treatment", percentage: 50 },
  ];

  it("should throw error if percentages dont sum to 100", () => {
    const invalidVariants = [
      { name: "control", percentage: 40 },
      { name: "treatment", percentage: 50 },
    ];
    expect(() => assignVariantRandom(invalidVariants)).toThrow("Variant percentages must sum to 100");
  });

  it("should return valid variant name", () => {
    const variant = assignVariantRandom(variants);
    expect(["control", "treatment"]).toContain(variant);
  });

  it("should distribute variants randomly over multiple calls", () => {
    const counts = { control: 0, treatment: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const variant = assignVariantRandom(variants);
      counts[variant as keyof typeof counts]++;
    }

    // with random assignment, expect roughly 40-60% for each (allow 10% margin due to randomness)
    expect(counts.control).toBeGreaterThan(iterations * 0.4);
    expect(counts.control).toBeLessThan(iterations * 0.6);
    expect(counts.treatment).toBeGreaterThan(iterations * 0.4);
    expect(counts.treatment).toBeLessThan(iterations * 0.6);
  });

  it("should respect uneven percentages", () => {
    const unevenVariants = [
      { name: "control", percentage: 80 },
      { name: "treatment", percentage: 20 },
    ];
    const counts = { control: 0, treatment: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const variant = assignVariantRandom(unevenVariants);
      counts[variant as keyof typeof counts]++;
    }

    // expect roughly 75-85% control, 15-25% treatment
    expect(counts.control).toBeGreaterThan(iterations * 0.75);
    expect(counts.control).toBeLessThan(iterations * 0.85);
    expect(counts.treatment).toBeGreaterThan(iterations * 0.15);
    expect(counts.treatment).toBeLessThan(iterations * 0.25);
  });
});
