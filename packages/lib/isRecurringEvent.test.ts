import { describe, expect, it } from "vitest";

import { Frequency } from "@calcom/prisma/zod-utils";

import { isRecurringEvent, parseRecurringEvent } from "./isRecurringEvent";

describe("isRecurringEvent", () => {
  it("returns true for a valid recurring event object", () => {
    expect(
      isRecurringEvent({
        interval: 1,
        count: 10,
        freq: Frequency.WEEKLY,
      })
    ).toBe(true);
  });

  it("returns true for null (schema is nullable)", () => {
    expect(isRecurringEvent(null)).toBe(true);
  });

  it("returns false for non-object values", () => {
    expect(isRecurringEvent("string")).toBe(false);
    expect(isRecurringEvent(42)).toBe(false);
    expect(isRecurringEvent(true)).toBe(false);
  });

  it("returns false for object missing required fields", () => {
    expect(isRecurringEvent({})).toBe(false);
    expect(isRecurringEvent({ interval: 1 })).toBe(false);
  });

  it("returns false for object with wrong field types", () => {
    expect(
      isRecurringEvent({
        interval: "one",
        count: "ten",
        freq: "weekly",
      })
    ).toBe(false);
  });

  it("returns true with optional fields included", () => {
    expect(
      isRecurringEvent({
        interval: 2,
        count: 5,
        freq: Frequency.DAILY,
        dtstart: new Date(),
        until: new Date(),
        tzid: "America/New_York",
      })
    ).toBe(true);
  });
});

describe("parseRecurringEvent", () => {
  it("returns the object when it is a valid recurring event", () => {
    const event = { interval: 1, count: 10, freq: Frequency.WEEKLY };
    const result = parseRecurringEvent(event);
    expect(result).toEqual(event);
  });

  it("returns null for valid recurring event (null case)", () => {
    // null is valid per schema (.nullable()), so parseRecurringEvent returns null
    const result = parseRecurringEvent(null);
    expect(result).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseRecurringEvent("invalid")).toBeNull();
    expect(parseRecurringEvent({})).toBeNull();
    expect(parseRecurringEvent(42)).toBeNull();
  });
});
