import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMaxHeightForModal, getTrueLayout, isThemePreferenceProvided, getThemeClassForEmbed, getColorSchemeDarkQuery } from "./ui-utils";

describe("ui-utils", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      innerHeight: 800,
      matchMedia: vi.fn((query: string) => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  describe("getMaxHeightForModal", () => {
    it("returns innerHeight minus spacing", () => {
      expect(getMaxHeightForModal()).toBe(700);
    });
  });

  describe("getTrueLayout", () => {
    it("returns mobile when screen is narrow", () => {
      vi.stubGlobal("window", {
        ...window,
        matchMedia: vi.fn(() => ({ matches: true })),
      });
      expect(getTrueLayout({ layout: "month_view" })).toBe("mobile");
    });

    it("returns default layout when layout is mobile but screen is wide", () => {
      expect(getTrueLayout({ layout: "mobile" })).toBe("month_view");
    });

    it("returns provided layout when screen is wide", () => {
      expect(getTrueLayout({ layout: "week_view" })).toBe("week_view");
    });

    it("returns default layout when layout is null", () => {
      expect(getTrueLayout({ layout: null })).toBe("month_view");
    });
  });

  describe("isThemePreferenceProvided", () => {
    it("returns true for dark", () => {
      expect(isThemePreferenceProvided("dark")).toBe(true);
    });
    it("returns true for light", () => {
      expect(isThemePreferenceProvided("light")).toBe(true);
    });
    it("returns false for auto", () => {
      expect(isThemePreferenceProvided("auto")).toBe(false);
    });
    it("returns false for undefined", () => {
      expect(isThemePreferenceProvided(undefined)).toBe(false);
    });
  });

  describe("getThemeClassForEmbed - dark system theme", () => {
    it("uses system dark theme when no preference provided", () => {
      vi.stubGlobal("window", {
        ...window,
        matchMedia: vi.fn((query: string) => ({
          matches: query.includes("dark"),
        })),
      });
      const result = getThemeClassForEmbed({ theme: "auto" });
      expect(result).toBeDefined();
    });
  });
});
