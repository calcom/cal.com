import { describe, expect, it, vi } from "vitest";
import { validateEventLength } from "./validateEventLength";

const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
} as unknown as Parameters<typeof validateEventLength>[0]["logger"];

describe("validateEventLength", () => {
  it("accepts a booking matching the event type length", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2025-06-01T10:00:00Z",
        reqBodyEnd: "2025-06-01T10:30:00Z",
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).not.toThrow();
  });

  it("throws HttpError when duration does not match event type length", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2025-06-01T10:00:00Z",
        reqBodyEnd: "2025-06-01T10:45:00Z",
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).toThrow("Invalid event length");
  });

  it("accepts a duration that matches one of the multiple duration options", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2025-06-01T10:00:00Z",
        reqBodyEnd: "2025-06-01T11:00:00Z",
        eventTypeMultipleDuration: [30, 60, 90],
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).not.toThrow();
  });

  it("throws when duration does not match any multiple duration option", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2025-06-01T10:00:00Z",
        reqBodyEnd: "2025-06-01T10:45:00Z",
        eventTypeMultipleDuration: [30, 60, 90],
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).toThrow("Invalid event length");
  });

  it("uses eventTypeLength when eventTypeMultipleDuration is empty", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2025-06-01T10:00:00Z",
        reqBodyEnd: "2025-06-01T10:30:00Z",
        eventTypeMultipleDuration: [],
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).not.toThrow();
  });

  it("accepts a 15-minute event for a 15-minute event type", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2025-06-01T14:00:00Z",
        reqBodyEnd: "2025-06-01T14:15:00Z",
        eventTypeLength: 15,
        logger: mockLogger,
      })
    ).not.toThrow();
  });
});
