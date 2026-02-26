import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@calcom/embed-core/embed-iframe", () => ({
  sdkActionManager: {
    fire: vi.fn(),
  },
}));

import { getBrowserInfo, isSafariBrowser } from "./browser.utils";

describe("getBrowserInfo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty object when window is undefined (SSR)", () => {
    // window is undefined in this test environment by default
    vi.stubGlobal("window", undefined);
    expect(getBrowserInfo()).toEqual({});
  });

  it("returns browser info when window is defined", () => {
    vi.stubGlobal("window", {
      document: {
        location: {
          href: "https://app.cal.com/booking/123?ref=test",
          pathname: "/booking/123",
          search: "?ref=test",
          origin: "https://app.cal.com",
        },
        referrer: "https://google.com",
        title: "Cal.com Booking",
      },
    });

    const info = getBrowserInfo();

    expect(info.url).toBe("https://app.cal.com/booking/123?ref=test");
    expect(info.path).toBe("/booking/123");
    expect(info.query).toBe("?ref=test");
    expect(info.origin).toBe("https://app.cal.com");
    expect(info.referrer).toBe("https://google.com");
    expect(info.title).toBe("Cal.com Booking");
  });
});

describe("isSafariBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(isSafariBrowser()).toBe(false);
  });

  it("returns true for Safari user agent", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    });

    expect(isSafariBrowser()).toBe(true);
  });

  it("returns false for Chrome user agent (includes safari but also chrome)", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    expect(isSafariBrowser()).toBe(false);
  });

  it("returns false for Firefox user agent", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:121.0) Gecko/20100101 Firefox/121.0",
    });

    expect(isSafariBrowser()).toBe(false);
  });
});
