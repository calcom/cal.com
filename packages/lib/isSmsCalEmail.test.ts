import { describe, expect, it } from "vitest";

import isSmsCalEmail from "./isSmsCalEmail";

describe("isSmsCalEmail", () => {
  it("returns true for @sms.cal.com emails", () => {
    expect(isSmsCalEmail("1234567890@sms.cal.com")).toBe(true);
  });

  it("returns false for regular emails", () => {
    expect(isSmsCalEmail("user@example.com")).toBe(false);
  });

  it("returns false for similar but different domains", () => {
    expect(isSmsCalEmail("user@cal.com")).toBe(false);
    expect(isSmsCalEmail("user@sms.cal.org")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSmsCalEmail("")).toBe(false);
  });

  it("is case-sensitive (domain matching)", () => {
    expect(isSmsCalEmail("user@SMS.CAL.COM")).toBe(false);
  });
});
