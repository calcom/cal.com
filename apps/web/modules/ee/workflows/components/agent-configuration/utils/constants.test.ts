import { describe, expect, it } from "vitest";

import { LANGUAGE_OPTIONS } from "./constants";

describe("LANGUAGE_OPTIONS", () => {
  it("contains multiple language options", () => {
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThan(0);
  });

  it("each option has a value and label", () => {
    LANGUAGE_OPTIONS.forEach((option) => {
      expect(option.value).toBeTruthy();
      expect(option.label).toBeTruthy();
    });
  });

  it("has unique values", () => {
    const values = LANGUAGE_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("includes English (US) as first option", () => {
    expect(LANGUAGE_OPTIONS[0].value).toBe("en-US");
    expect(LANGUAGE_OPTIONS[0].label).toBe("English (US)");
  });

  it("includes Multilingual as last option", () => {
    const lastOption = LANGUAGE_OPTIONS[LANGUAGE_OPTIONS.length - 1];
    expect(lastOption.value).toBe("multi");
    expect(lastOption.label).toBe("Multilingual");
  });

  it("includes common languages", () => {
    const values = LANGUAGE_OPTIONS.map((o) => o.value);
    expect(values).toContain("de-DE");
    expect(values).toContain("fr-FR");
    expect(values).toContain("es-ES");
    expect(values).toContain("ja-JP");
    expect(values).toContain("zh-CN");
  });

  it("uses BCP 47 locale tags for values (except multi)", () => {
    const nonMultiOptions = LANGUAGE_OPTIONS.filter((o) => o.value !== "multi");
    nonMultiOptions.forEach((option) => {
      expect(option.value).toMatch(/^[a-z]{2}-[A-Z0-9]{2,3}$/);
    });
  });
});
