import { describe, expect, it, vi } from "vitest";

vi.mock("./isPrismaObj", () => ({
  default: (val: unknown) => typeof val === "object" && val !== null && !Array.isArray(val),
}));

import hasKeyInMetadata from "./hasKeyInMetadata";

describe("hasKeyInMetadata", () => {
  it("returns true when key exists in metadata", () => {
    expect(hasKeyInMetadata({ metadata: { myKey: "value" } }, "myKey")).toBe(true);
  });

  it("returns false when key does not exist", () => {
    expect(hasKeyInMetadata({ metadata: { other: "value" } }, "myKey")).toBe(false);
  });

  it("returns false when metadata is null", () => {
    expect(hasKeyInMetadata({ metadata: null }, "myKey")).toBe(false);
  });

  it("returns false when input is null", () => {
    expect(hasKeyInMetadata(null, "myKey")).toBe(false);
  });

  it("returns false when metadata is an array", () => {
    expect(hasKeyInMetadata({ metadata: ["a", "b"] }, "myKey")).toBe(false);
  });

  it("returns true for boolean metadata value", () => {
    expect(hasKeyInMetadata({ metadata: { flag: true } }, "flag")).toBe(true);
  });
});
