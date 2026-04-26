import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  },
}));

import { isBrowserLocale24h } from "./timeFormat";

describe("isBrowserLocale24h", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for 24h hourCycle", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      function (): Intl.DateTimeFormat {
        return {
          resolvedOptions: () => ({ hourCycle: "h23" }),
        } as unknown as Intl.DateTimeFormat;
      }
    );

    expect(isBrowserLocale24h()).toBe(true);
  });

  it("returns false for 12h hourCycle", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      function (): Intl.DateTimeFormat {
        return {
          resolvedOptions: () => ({ hourCycle: "h12" }),
        } as unknown as Intl.DateTimeFormat;
      }
    );

    expect(isBrowserLocale24h()).toBe(false);
  });
});