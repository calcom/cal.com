import { describe, expect, it } from "vitest";
import { assignVariant, hashUserToPercent } from "../lib/bucketing";

describe("hashUserToPercent", () => {
  it("returns a number between 0 and 99", () => {
    for (let userId = 1; userId <= 100; userId++) {
      const result = hashUserToPercent(userId, "test-experiment");
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(100);
    }
  });

  it("is deterministic for the same userId and experimentSlug", () => {
    const a = hashUserToPercent(42, "billing-upgrade-cta");
    const b = hashUserToPercent(42, "billing-upgrade-cta");
    expect(a).toBe(b);
  });

  it("produces different results for different userIds", () => {
    const a = hashUserToPercent(1, "billing-upgrade-cta");
    const b = hashUserToPercent(2, "billing-upgrade-cta");
    expect(a).not.toBe(b);
  });

  it("produces different results for different experiment slugs", () => {
    const a = hashUserToPercent(42, "experiment-a");
    const b = hashUserToPercent(42, "experiment-b");
    expect(a).not.toBe(b);
  });

  it("distributes roughly evenly across 0-99", () => {
    const counts = new Array(10).fill(0);
    for (let userId = 1; userId <= 10000; userId++) {
      const bucket = hashUserToPercent(userId, "distribution-test");
      counts[Math.floor(bucket / 10)]++;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

describe("assignVariant", () => {
  it("returns null (control) when no variants", () => {
    expect(assignVariant(50, [])).toBeNull();
  });

  it("assigns to variant when userPercent is within range", () => {
    const variants = [{ slug: "upgrade_button", weight: 50 }];
    expect(assignVariant(0, variants)).toBe("upgrade_button");
    expect(assignVariant(25, variants)).toBe("upgrade_button");
    expect(assignVariant(49, variants)).toBe("upgrade_button");
  });

  it("assigns to control when userPercent is outside variant range", () => {
    const variants = [{ slug: "upgrade_button", weight: 50 }];
    expect(assignVariant(50, variants)).toBeNull();
    expect(assignVariant(75, variants)).toBeNull();
    expect(assignVariant(99, variants)).toBeNull();
  });

  it("handles multiple variants with correct ranges", () => {
    const variants = [
      { slug: "variant_a", weight: 30 },
      { slug: "variant_b", weight: 30 },
    ];
    expect(assignVariant(0, variants)).toBe("variant_a");
    expect(assignVariant(29, variants)).toBe("variant_a");
    expect(assignVariant(30, variants)).toBe("variant_b");
    expect(assignVariant(59, variants)).toBe("variant_b");
    expect(assignVariant(60, variants)).toBeNull();
    expect(assignVariant(99, variants)).toBeNull();
  });

  it("increasing weight only adds users to variant, never removes", () => {
    const variantsAt50 = [{ slug: "upgrade_button", weight: 50 }];
    const variantsAt80 = [{ slug: "upgrade_button", weight: 80 }];

    for (let percent = 0; percent < 100; percent++) {
      const at50 = assignVariant(percent, variantsAt50);
      const at80 = assignVariant(percent, variantsAt80);
      if (at50 === "upgrade_button") {
        expect(at80).toBe("upgrade_button");
      }
    }
  });

  it("assigns to variant at weight 100", () => {
    const variants = [{ slug: "upgrade_button", weight: 100 }];
    for (let percent = 0; percent < 100; percent++) {
      expect(assignVariant(percent, variants)).toBe("upgrade_button");
    }
  });

  it("returns control at weight 0", () => {
    const variants = [{ slug: "upgrade_button", weight: 0 }];
    for (let percent = 0; percent < 100; percent++) {
      expect(assignVariant(percent, variants)).toBeNull();
    }
  });
});
