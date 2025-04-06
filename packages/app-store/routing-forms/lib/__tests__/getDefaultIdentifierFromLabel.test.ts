import { describe, it, expect } from "vitest";

import { getDefaultIdentifierFromLabel } from "../getDefaultIdentifierFromLabel";

describe("getDefaultIdentifierFromLabel", () => {
  it("should convert spaces to underscores and lowercase", () => {
    expect(getDefaultIdentifierFromLabel("My Label")).toBe("my_label");
  });

  it("should handle multiple spaces", () => {
    expect(getDefaultIdentifierFromLabel("My   Label")).toBe("my_label");
  });

  it("should handle leading and trailing spaces", () => {
    expect(getDefaultIdentifierFromLabel("  My Label  ")).toBe("my_label");
  });

  it("should handle all spaces", () => {
    expect(getDefaultIdentifierFromLabel("   ")).toBe("");
  });

  it("should handle empty string", () => {
    expect(getDefaultIdentifierFromLabel("")).toBe("");
  });

  it("should handle mixed case", () => {
    expect(getDefaultIdentifierFromLabel("My LABEL")).toBe("my_label");
  });
});
