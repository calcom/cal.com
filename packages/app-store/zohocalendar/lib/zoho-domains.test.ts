import { describe, expect, it } from "vitest";

import { getValidZohoDomain } from "./zoho-domains";

describe("getValidZohoDomain", () => {
  it.each([
    ["us", "com"],
    ["eu", "eu"],
    ["in", "in"],
    ["cn", "com.cn"],
    ["jp", "jp"],
    ["au", "com.au"],
  ])("maps location '%s' to domain '%s'", (location, expected) => {
    expect(getValidZohoDomain(location)).toBe(expected);
  });

  it("falls back to 'com' for undefined location", () => {
    expect(getValidZohoDomain(undefined)).toBe("com");
  });

  it("falls back to 'com' for unknown location", () => {
    expect(getValidZohoDomain("evil.com")).toBe("com");
  });
});
