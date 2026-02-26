import { describe, expect, it } from "vitest";

import { extractBaseEmail } from "./extract-base-email";

describe("extractBaseEmail", () => {
  it("returns the same email when no sub-addressing is used", () => {
    expect(extractBaseEmail("user@example.com")).toBe("user@example.com");
  });

  it("strips the +tag from sub-addressed emails", () => {
    expect(extractBaseEmail("user+tag@example.com")).toBe("user@example.com");
  });

  it("strips everything after the first + in local part", () => {
    expect(extractBaseEmail("user+a+b@example.com")).toBe("user@example.com");
  });

  it("preserves the domain unchanged", () => {
    expect(extractBaseEmail("user+tag@sub.domain.com")).toBe("user@sub.domain.com");
  });

  it("handles email with no local part before +", () => {
    expect(extractBaseEmail("+tag@example.com")).toBe("@example.com");
  });

  it("handles email with dots in local part", () => {
    expect(extractBaseEmail("first.last+tag@example.com")).toBe("first.last@example.com");
  });
});
