import { describe, expect, it, vi } from "vitest";

vi.mock("./isPrismaObj", () => ({
  default: (val: unknown) => typeof val === "object" && val !== null && !Array.isArray(val),
}));

import hasKeyInMetadata from "./hasKeyInMetadata";

describe("hasKeyInMetadata", () => {
  it("returns true when key exists in metadata object", () => {
    expect(hasKeyInMetadata({ metadata: { foo: "bar" } }, "foo")).toBe(true);
  });

  it("returns false when key does not exist in metadata", () => {
    expect(hasKeyInMetadata({ metadata: { foo: "bar" } }, "baz")).toBe(false);
  });

  it("returns false when metadata is null", () => {
    expect(hasKeyInMetadata({ metadata: null }, "foo")).toBe(false);
  });

  it("returns false when the object is null", () => {
    expect(hasKeyInMetadata(null, "foo")).toBe(false);
  });

  it("returns true for boolean value in metadata", () => {
    expect(hasKeyInMetadata({ metadata: { enabled: true } }, "enabled")).toBe(true);
  });

  it("returns true for numeric value in metadata", () => {
    expect(hasKeyInMetadata({ metadata: { count: 42 } }, "count")).toBe(true);
  });

  it("returns false when metadata is a string (not an object)", () => {
    expect(hasKeyInMetadata({ metadata: "not-an-object" }, "key")).toBe(false);
  });

  it("returns false when metadata is an array", () => {
    expect(hasKeyInMetadata({ metadata: [1, 2, 3] }, "key")).toBe(false);
  });
});
