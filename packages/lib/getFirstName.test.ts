import { describe, expect, it } from "vitest";

import { getFirstName } from "./getFirstName";

describe("getFirstName", () => {
  it("returns givenName when provided", () => {
    expect(getFirstName("John Doe", "Johnny")).toBe("Johnny");
  });

  it("returns givenName even when name is null", () => {
    expect(getFirstName(null, "Johnny")).toBe("Johnny");
  });

  it("returns givenName even when name is undefined", () => {
    expect(getFirstName(undefined, "Johnny")).toBe("Johnny");
  });

  it("extracts first word from full name when givenName is not provided", () => {
    expect(getFirstName("John Doe")).toBe("John");
  });

  it("extracts first word from full name when givenName is null", () => {
    expect(getFirstName("John Doe", null)).toBe("John");
  });

  it("extracts first word from full name when givenName is empty string", () => {
    expect(getFirstName("John Doe", "")).toBe("John");
  });

  it("returns the entire name when there is no space", () => {
    expect(getFirstName("John")).toBe("John");
  });

  it("handles names with multiple spaces", () => {
    expect(getFirstName("John Michael Doe")).toBe("John");
  });

  it("returns empty string when name is null and givenName is not provided", () => {
    expect(getFirstName(null)).toBe("");
  });

  it("returns empty string when name is undefined and givenName is not provided", () => {
    expect(getFirstName(undefined)).toBe("");
  });

  it("returns empty string when name is empty string and givenName is not provided", () => {
    expect(getFirstName("")).toBe("");
  });

  it("returns empty string when both name and givenName are empty", () => {
    expect(getFirstName("", "")).toBe("");
  });

  it("handles leading spaces in name", () => {
    expect(getFirstName(" John Doe")).toBe("");
  });

  it("handles trailing spaces in name", () => {
    expect(getFirstName("John Doe ")).toBe("John");
  });
});
