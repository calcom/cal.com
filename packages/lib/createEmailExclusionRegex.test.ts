import { describe, it, expect } from "vitest";

import { createEmailExclusionRegex } from "./createEmailExlusionRegex";

describe("createExclusionRegex", () => {
  it("should create regex for full email match", () => {
    const exclusionString = "spammer@cal.com";
    const regex = createEmailExclusionRegex(exclusionString);

    expect(regex.test("spammer@cal.com")).toBe(true);
    expect(regex.test("user@cal.com")).toBe(false);
  });

  it("should create regex for domain match", () => {
    const exclusionString = "gmail.com";
    const regex = createEmailExclusionRegex(exclusionString);

    expect(regex.test("user@gmail.com")).toBe(true);
    expect(regex.test("user@yahoo.com")).toBe(false);
    expect(regex.test("@gmail.com")).toBe(true);
  });

  it("should create regex for keyword match", () => {
    const exclusionString = "spammer";
    const regex = createEmailExclusionRegex(exclusionString);

    expect(regex.test("cal@spammer.com")).toBe(true);
    expect(regex.test("user@cal.com")).toBe(false);
    // strict matching
    expect(regex.test("user@spammerdomain.com")).toBe(false);
  });

  it("should handle multiple exclusions (comma-separated)", () => {
    const exclusionString = "spammer,gmail.com,test@domain.com";
    const regex = createEmailExclusionRegex(exclusionString);

    expect(regex.test("cal@spammer.com")).toBe(true);
    expect(regex.test("user@gmail.com")).toBe(true);
    expect(regex.test("test@domain.com")).toBe(true);

    expect(regex.test("otheruser@domain.com")).toBe(false);
    expect(regex.test("user@otherdomain.com")).toBe(false);
  });

  it("should handle empty exclusion string", () => {
    const exclusionString = "";
    const regex = createEmailExclusionRegex(exclusionString);

    expect(regex.test("anyemail@cal.com")).toBe(false);
  });

  it("should escape special characters in exclusion terms", () => {
    const exclusionString = "spammer$@cal.com";
    const regex = createEmailExclusionRegex(exclusionString);

    expect(regex.test("spammer$@cal.com")).toBe(true);
    expect(regex.test("spammer@cal.com")).toBe(false);
  });
});
