// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { navigateInTopWindow } from "./navigateInTopWindow";

describe("navigateInTopWindow", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("sets window.top.location.href when window.top is available", () => {
    const topLocation = { href: "" };
    Object.defineProperty(window, "top", {
      value: { location: topLocation },
      writable: true,
      configurable: true,
    });
    navigateInTopWindow("https://example.com");
    expect(topLocation.href).toBe("https://example.com");
  });

  it("falls back to window.location when window.top is null", () => {
    Object.defineProperty(window, "top", {
      value: null,
      writable: true,
      configurable: true,
    });
    navigateInTopWindow("https://fallback.com");
    expect(window.location.href).toBe("https://fallback.com");
  });
});
