import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

import { HttpError } from "@calcom/lib/http-error";
import { validateEventLength } from "./validateEventLength";

const mockLogger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as never;

describe("validateEventLength", () => {
  it("does not throw when event length matches eventTypeLength", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2024-01-15T10:00:00Z",
        reqBodyEnd: "2024-01-15T10:30:00Z",
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).not.toThrow();
  });

  it("throws HttpError 400 when event length does not match", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2024-01-15T10:00:00Z",
        reqBodyEnd: "2024-01-15T10:45:00Z",
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).toThrow(HttpError);
  });

  it("accepts any valid multiple duration", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2024-01-15T10:00:00Z",
        reqBodyEnd: "2024-01-15T11:00:00Z",
        eventTypeMultipleDuration: [15, 30, 60],
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).not.toThrow();
  });

  it("throws when duration is not in multipleDuration list", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2024-01-15T10:00:00Z",
        reqBodyEnd: "2024-01-15T10:45:00Z",
        eventTypeMultipleDuration: [15, 30, 60],
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).toThrow("Invalid event length");
  });

  it("uses eventTypeLength when multipleDuration is empty", () => {
    expect(() =>
      validateEventLength({
        reqBodyStart: "2024-01-15T10:00:00Z",
        reqBodyEnd: "2024-01-15T10:30:00Z",
        eventTypeMultipleDuration: [],
        eventTypeLength: 30,
        logger: mockLogger,
      })
    ).not.toThrow();
  });
});
