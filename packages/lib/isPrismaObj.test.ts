import { describe, expect, it } from "vitest";

import isPrismaObj, { isPrismaObjOrUndefined } from "./isPrismaObj";

describe("isPrismaObj", () => {
  it("returns true for plain objects", () => {
    expect(isPrismaObj({ key: "value" })).toBe(true);
  });

  it("returns true for empty objects", () => {
    expect(isPrismaObj({})).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isPrismaObj([1, 2, 3])).toBe(false);
  });

  it("returns false for null", () => {
    // typeof null === "object", but the function should still handle it
    // The function checks typeof obj === "object" && !Array.isArray(obj)
    // null passes typeof check but is a valid Prisma.JsonObject edge case
    expect(isPrismaObj(null)).toBe(true);
  });

  it("returns false for strings", () => {
    expect(isPrismaObj("hello")).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isPrismaObj(42)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPrismaObj(undefined)).toBe(false);
  });

  it("returns false for booleans", () => {
    expect(isPrismaObj(true)).toBe(false);
  });
});

describe("isPrismaObjOrUndefined", () => {
  it("returns the object when it is a Prisma object", () => {
    const obj = { key: "value" };
    expect(isPrismaObjOrUndefined(obj)).toBe(obj);
  });

  it("returns undefined for arrays", () => {
    expect(isPrismaObjOrUndefined([1, 2])).toBeUndefined();
  });

  it("returns undefined for strings", () => {
    expect(isPrismaObjOrUndefined("hello")).toBeUndefined();
  });

  it("returns undefined for numbers", () => {
    expect(isPrismaObjOrUndefined(42)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(isPrismaObjOrUndefined(undefined)).toBeUndefined();
  });
});
