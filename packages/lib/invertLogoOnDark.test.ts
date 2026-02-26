import { describe, expect, it } from "vitest";
import invertLogoOnDark from "./invertLogoOnDark";

describe("invertLogoOnDark", () => {
  it("returns 'dark:invert' for URL with -dark", () => {
    expect(invertLogoOnDark("/app-store/zoom-dark.svg")).toBe("dark:invert");
  });

  it("returns 'invert dark:invert-0' for URL with -dark and opposite=true", () => {
    expect(invertLogoOnDark("/app-store/zoom-dark.svg", true)).toBe("invert dark:invert-0");
  });

  it("returns empty string for app-store URL without -dark", () => {
    expect(invertLogoOnDark("/app-store/zoom.svg")).toBe("");
  });

  it("returns empty string for app-store URL without -dark and opposite=true", () => {
    expect(invertLogoOnDark("/app-store/zoom.svg", true)).toBe("");
  });

  it("returns 'dark:invert' for non-app-store URL", () => {
    expect(invertLogoOnDark("/some/other/path.svg")).toBe("dark:invert");
  });

  it("returns 'invert dark:invert-0' for non-app-store URL with opposite=true", () => {
    expect(invertLogoOnDark("/some/other/path.svg", true)).toBe("invert dark:invert-0");
  });

  it("returns 'dark:invert' for undefined URL", () => {
    expect(invertLogoOnDark(undefined)).toBe("dark:invert");
  });

  it("returns 'invert dark:invert-0' for undefined URL with opposite=true", () => {
    expect(invertLogoOnDark(undefined, true)).toBe("invert dark:invert-0");
  });

  it("returns empty string for opposite false with app-store URL", () => {
    expect(invertLogoOnDark("/app-store/zoom.svg", false)).toBe("");
  });
});
