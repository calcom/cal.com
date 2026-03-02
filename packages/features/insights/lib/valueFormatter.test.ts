import { describe, it, expect } from "vitest";

import { valueFormatter } from "./valueFormatter";

describe("valueFormatter", () => {
  it("should format zero", () => {
    expect(valueFormatter(0)).toBe("0");
  });

  it("should format small numbers without commas", () => {
    expect(valueFormatter(1)).toBe("1");
    expect(valueFormatter(999)).toBe("999");
  });

  it("should format thousands with locale-specific separators", () => {
    const result = valueFormatter(1000);
    // Intl.NumberFormat uses locale-specific separators
    expect(result).toMatch(/1.?000/);
  });

  it("should format large numbers", () => {
    const result = valueFormatter(1000000);
    expect(result).toMatch(/1.?000.?000/);
  });

  it("should format negative numbers", () => {
    const result = valueFormatter(-500);
    expect(result).toContain("500");
  });

  it("should format decimal numbers", () => {
    const result = valueFormatter(3.14);
    expect(result).toContain("3");
  });
});
