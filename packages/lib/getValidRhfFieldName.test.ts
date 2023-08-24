import { describe, expect, it } from "vitest";

import { getValidRhfFieldName } from "./getValidRhfFieldName";

describe("getValidRhfFieldName", () => {
  it("should not convert to lowercase", () => {
    expect(getValidRhfFieldName("Hello")).toEqual("Hello");
    expect(getValidRhfFieldName("HELLO")).toEqual("HELLO");
  });

  it("should convert spaces, _, and any other special character to -", () => {
    expect(getValidRhfFieldName("hello there")).toEqual("hello-there");
    expect(getValidRhfFieldName("hello_there")).toEqual("hello-there");
    expect(getValidRhfFieldName("hello$there")).toEqual("hello-there");
    expect(getValidRhfFieldName("$hello$there")).toEqual("-hello-there");
    expect(getValidRhfFieldName("$hello.there")).toEqual("-hello-there");
  });

  // So that user can freely add spaces and any other character iteratively and it get's converted to - and he can add more characters.
  // We don't really care about a hyphen in the end
  it("should not remove dashes from start and end.", () => {
    expect(getValidRhfFieldName("hello-there-")).toEqual("hello-there-");
    expect(getValidRhfFieldName("hello-there_")).toEqual("hello-there-");
    expect(getValidRhfFieldName("_hello-there_")).toEqual("-hello-there-");
    expect(getValidRhfFieldName("$hello-there_")).toEqual("-hello-there-");
  });

  it("should remove unicode and emoji characters", () => {
    expect(getValidRhfFieldName("Hello 📚🕯️®️ There")).toEqual("Hello---------There");
    expect(getValidRhfFieldName("📚🕯️®️")).toEqual("-------");
  });

  it("should keep numbers as is", () => {
    expect(getValidRhfFieldName("hellothere123")).toEqual("hellothere123");
    expect(getValidRhfFieldName("321hello there123")).toEqual("321hello-there123");
    expect(getValidRhfFieldName("hello$there")).toEqual("hello-there");
  });
});
