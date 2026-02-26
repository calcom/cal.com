import { describe, expect, it, vi } from "vitest";

vi.mock("./constants", () => ({
  AVATAR_FALLBACK: "/avatar.svg",
}));

import checkIfItFallbackImage from "./checkIfItFallbackImage";

describe("checkIfItFallbackImage", () => {
  it("returns true for empty string", () => {
    expect(checkIfItFallbackImage("")).toBe(true);
  });

  it("returns true when URL ends with fallback path", () => {
    expect(checkIfItFallbackImage("https://app.cal.com/avatar.svg")).toBe(true);
  });

  it("returns false for real image URL", () => {
    expect(checkIfItFallbackImage("https://cdn.example.com/user-photo.jpg")).toBe(false);
  });

  it("returns false for URL that contains but does not end with fallback", () => {
    expect(checkIfItFallbackImage("/avatar.svg/extra")).toBe(false);
  });
});
