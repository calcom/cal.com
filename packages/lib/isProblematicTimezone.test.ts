import { describe, expect, it } from "vitest";
import isProblematicTimezone from "./isProblematicTimezone";

describe("isProblematicTimezone", () => {
  it("returns true for 'null' string", () => {
    expect(isProblematicTimezone("null")).toBe(true);
  });

  it("returns true for known problematic timezone 'Africa/Malabo'", () => {
    expect(isProblematicTimezone("Africa/Malabo")).toBe(true);
  });

  it("returns true for 'America/Nassau'", () => {
    expect(isProblematicTimezone("America/Nassau")).toBe(true);
  });

  it("returns true for 'Europe/Vatican'", () => {
    expect(isProblematicTimezone("Europe/Vatican")).toBe(true);
  });

  it("returns true for 'Africa/Asmara' (last entry)", () => {
    expect(isProblematicTimezone("Africa/Asmara")).toBe(true);
  });

  it("returns false for a non-problematic timezone like 'America/New_York'", () => {
    expect(isProblematicTimezone("America/New_York")).toBe(false);
  });

  it("returns false for 'Europe/London'", () => {
    expect(isProblematicTimezone("Europe/London")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isProblematicTimezone("")).toBe(false);
  });
});
