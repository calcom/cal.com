import { describe, expect, it, beforeEach, vi } from "vitest";

import { isBrowserLocale24h, setIs24hClockInLocalStorage } from "./timeFormat";

describe("timeFormat", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should accurately detect 12-hour locales with non-Latin AM/PM markers", () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;

    const mockFormat = (locale: string) => {
      const impl = new originalDateTimeFormat(locale, { hour: "numeric" });
      return {
        format: (date: number | Date) => impl.format(date),
        resolvedOptions: () => impl.resolvedOptions(),
      } as unknown as Intl.DateTimeFormat;
    };

    vi.spyOn(Intl, "DateTimeFormat").mockImplementation((locale) => mockFormat((locale as string) || "ar-EG"));

    expect(isBrowserLocale24h()).toBe(false);
    vi.restoreAllMocks();
  });
});
