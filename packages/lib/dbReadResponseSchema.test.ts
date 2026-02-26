import { describe, expect, it } from "vitest";
import { dbReadResponseSchema } from "./dbReadResponseSchema";

describe("dbReadResponseSchema", () => {
  it("accepts a plain string", () => {
    const result = dbReadResponseSchema.safeParse("hello");
    expect(result.success).toBe(true);
  });

  it("accepts a boolean", () => {
    const resultTrue = dbReadResponseSchema.safeParse(true);
    expect(resultTrue.success).toBe(true);
    const resultFalse = dbReadResponseSchema.safeParse(false);
    expect(resultFalse.success).toBe(true);
  });

  it("accepts a string array", () => {
    const result = dbReadResponseSchema.safeParse(["option1", "option2"]);
    expect(result.success).toBe(true);
  });

  it("accepts an optionValue/value object", () => {
    const result = dbReadResponseSchema.safeParse({ optionValue: "opt1", value: "Option 1" });
    expect(result.success).toBe(true);
  });

  it("accepts a record of strings (variantsConfig)", () => {
    const result = dbReadResponseSchema.safeParse({ key1: "value1", key2: "value2" });
    expect(result.success).toBe(true);
  });

  it("rejects a number", () => {
    const result = dbReadResponseSchema.safeParse(42);
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = dbReadResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects undefined", () => {
    const result = dbReadResponseSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });
});
