import { describe, expect, it } from "vitest";

import { slugifyLenient } from "./slugify-lenient";

describe("slugifyLenient", () => {
  it("returns empty string for empty input", () => {
    expect(slugifyLenient("")).toBe("");
  });

  it("returns empty string for falsy input", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(slugifyLenient(undefined as unknown as string)).toBe("");
  });

  it("trims whitespace from both sides", () => {
    expect(slugifyLenient("  hello  ")).toBe("hello");
  });

  it("removes leading dashes", () => {
    expect(slugifyLenient("---hello")).toBe("hello");
  });

  it("removes leading periods", () => {
    expect(slugifyLenient("...hello")).toBe("hello");
  });

  it("removes leading underscores", () => {
    expect(slugifyLenient("___hello")).toBe("hello");
  });

  it("preserves trailing dashes, periods, and underscores", () => {
    expect(slugifyLenient("hello---")).toBe("hello---");
    expect(slugifyLenient("hello...")).toBe("hello...");
    expect(slugifyLenient("hello___")).toBe("hello___");
  });

  it("preserves internal special characters", () => {
    expect(slugifyLenient("hello-world")).toBe("hello-world");
    expect(slugifyLenient("hello.world")).toBe("hello.world");
    expect(slugifyLenient("hello_world")).toBe("hello_world");
  });

  it("removes leading dashes after trimming whitespace", () => {
    expect(slugifyLenient("  --hello  ")).toBe("hello");
  });

  it("preserves uppercase and special characters", () => {
    expect(slugifyLenient("Hello World!")).toBe("Hello World!");
  });

  it("handles string with only special leading characters", () => {
    expect(slugifyLenient("---")).toBe("");
    expect(slugifyLenient("...")).toBe("");
    expect(slugifyLenient("___")).toBe("");
  });
});
