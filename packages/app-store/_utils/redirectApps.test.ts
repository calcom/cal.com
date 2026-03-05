import { describe, it, expect } from "vitest";

import { isRedirectApp } from "./redirectApps";

describe("isRedirectApp", () => {
  it("should return true for a known redirect app", () => {
    expect(isRedirectApp("zapier")).toBe(true);
  });

  it("should return false for an unknown app", () => {
    expect(isRedirectApp("google-calendar")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isRedirectApp("")).toBe(false);
  });
});
