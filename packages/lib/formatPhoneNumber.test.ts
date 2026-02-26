import { describe, expect, it } from "vitest";
import { formatPhoneNumber } from "./formatPhoneNumber";

describe("formatPhoneNumber", () => {
  it("formats a valid US phone number to international format", () => {
    const result = formatPhoneNumber("+14155552671");
    expect(result).toBe("+1 415 555 2671");
  });

  it("formats a valid UK phone number to international format", () => {
    const result = formatPhoneNumber("+442071234567");
    expect(result).toContain("+44");
  });

  it("returns the original string for an invalid phone number", () => {
    const result = formatPhoneNumber("+1234");
    expect(result).toBe("+1234");
  });

  it("handles phone number with country code prefix", () => {
    const result = formatPhoneNumber("+61412345678");
    expect(result).toContain("+61");
  });

  it("throws for completely malformed input", () => {
    expect(() => formatPhoneNumber("not-a-number")).toThrow();
  });

  it("throws for empty string", () => {
    expect(() => formatPhoneNumber("")).toThrow();
  });
});
