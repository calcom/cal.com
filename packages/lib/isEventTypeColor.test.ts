import { describe, expect, it } from "vitest";

import { isEventTypeColor, parseEventTypeColor } from "./isEventTypeColor";

describe("isEventTypeColor", () => {
  it("returns true for valid event type color object", () => {
    expect(
      isEventTypeColor({
        lightEventTypeColor: "#ffffff",
        darkEventTypeColor: "#000000",
      })
    ).toBe(true);
  });

  it("returns true for null (schema is nullable)", () => {
    expect(isEventTypeColor(null)).toBe(true);
  });

  it("returns false for non-object values", () => {
    expect(isEventTypeColor("string")).toBe(false);
    expect(isEventTypeColor(42)).toBe(false);
    expect(isEventTypeColor(undefined)).toBe(false);
  });

  it("returns false for object missing required fields", () => {
    expect(isEventTypeColor({})).toBe(false);
    expect(isEventTypeColor({ lightEventTypeColor: "#fff" })).toBe(false);
    expect(isEventTypeColor({ darkEventTypeColor: "#000" })).toBe(false);
  });

  it("returns false for object with non-string color values", () => {
    expect(
      isEventTypeColor({
        lightEventTypeColor: 123,
        darkEventTypeColor: 456,
      })
    ).toBe(false);
  });
});

describe("parseEventTypeColor", () => {
  it("returns the color object when valid", () => {
    const color = { lightEventTypeColor: "#ff0000", darkEventTypeColor: "#0000ff" };
    expect(parseEventTypeColor(color)).toEqual(color);
  });

  it("returns null for null input (nullable schema)", () => {
    expect(parseEventTypeColor(null)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseEventTypeColor("invalid")).toBeNull();
    expect(parseEventTypeColor({})).toBeNull();
    expect(parseEventTypeColor(42)).toBeNull();
  });
});
