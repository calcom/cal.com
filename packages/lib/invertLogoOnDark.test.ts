import { describe, expect, it } from "vitest";
import invertLogoOnDark from "./invertLogoOnDark";

describe("invertLogoOnDark", () => {
  it('returns "dark:invert" for URL containing "-dark"', () => {
    expect(invertLogoOnDark("/app-store/google-dark.svg")).toBe("dark:invert");
  });

  it('returns "dark:invert" for URL not starting with /app-store', () => {
    expect(invertLogoOnDark("/logos/cal.svg")).toBe("dark:invert");
  });

  it("returns empty string for /app-store URL without -dark", () => {
    expect(invertLogoOnDark("/app-store/google.svg")).toBe("");
  });

  it('returns "invert dark:invert-0" when opposite is true and URL has -dark', () => {
    expect(invertLogoOnDark("/app-store/google-dark.svg", true)).toBe("invert dark:invert-0");
  });

  it('returns "invert dark:invert-0" when opposite is true for non-app-store URL', () => {
    expect(invertLogoOnDark("/logos/cal.svg", true)).toBe("invert dark:invert-0");
  });

  it('returns "dark:invert" for undefined URL', () => {
    expect(invertLogoOnDark(undefined)).toBe("dark:invert");
  });

  it("returns empty string for /app-store/google URL", () => {
    expect(invertLogoOnDark("/app-store/google")).toBe("");
  });

  it("returns empty string for opposite false with app-store URL", () => {
    expect(invertLogoOnDark("/app-store/zoom.svg", false)).toBe("");
  });
});
