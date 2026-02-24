import { localStorage } from "@calcom/lib/webstorage";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getIs24hClockFromLocalStorage,
  getTimeFormatStringFromUserTimeFormat,
  isBrowserLocale24h,
  setIs24hClockInLocalStorage,
  TimeFormat,
} from "./timeFormat";

describe("getTimeFormatStringFromUserTimeFormat", () => {
  it("returns 24-hour format for 24", () => {
    expect(getTimeFormatStringFromUserTimeFormat(24)).toBe(TimeFormat.TWENTY_FOUR_HOUR);
  });

  it("returns 12-hour format for 12", () => {
    expect(getTimeFormatStringFromUserTimeFormat(12)).toBe(TimeFormat.TWELVE_HOUR);
  });

  it("returns 12-hour format for null", () => {
    expect(getTimeFormatStringFromUserTimeFormat(null)).toBe(TimeFormat.TWELVE_HOUR);
  });

  it("returns 12-hour format for undefined", () => {
    expect(getTimeFormatStringFromUserTimeFormat(undefined)).toBe(TimeFormat.TWELVE_HOUR);
  });
});

describe("setIs24hClockInLocalStorage / getIs24hClockFromLocalStorage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("stores and retrieves true", () => {
    setIs24hClockInLocalStorage(true);
    expect(getIs24hClockFromLocalStorage()).toBe(true);
  });

  it("stores and retrieves false", () => {
    setIs24hClockInLocalStorage(false);
    expect(getIs24hClockFromLocalStorage()).toBe(false);
  });

  it("returns null when nothing is stored", () => {
    expect(getIs24hClockFromLocalStorage()).toBeNull();
  });
});

describe("isBrowserLocale24h", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns true when localStorage has 'true'", () => {
    setIs24hClockInLocalStorage(true);
    expect(isBrowserLocale24h()).toBe(true);
  });

  it("returns false when localStorage has 'false'", () => {
    setIs24hClockInLocalStorage(false);
    expect(isBrowserLocale24h()).toBe(false);
  });

  it("detects 12h locale and stores false when no localStorage value", () => {
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    vi.stubGlobal("Intl", {
      ...Intl,
      DateTimeFormat: class extends OriginalDateTimeFormat {
        format(): string {
          return "1 AM";
        }
      },
    });

    expect(isBrowserLocale24h()).toBe(false);
    expect(localStorage.getItem("timeOption.is24hClock")).toBe("false");
  });

  it("detects 24h locale and stores true when no localStorage value", () => {
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    vi.stubGlobal("Intl", {
      ...Intl,
      DateTimeFormat: class extends OriginalDateTimeFormat {
        format(): string {
          return "13:00";
        }
      },
    });

    expect(isBrowserLocale24h()).toBe(true);
    expect(localStorage.getItem("timeOption.is24hClock")).toBe("true");
  });
});
