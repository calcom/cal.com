import { describe, expect, it } from "vitest";
import { isKeyInObject } from "./isKeyInObject";

describe("isKeyInObject", () => {
  it("returns true for an existing string key", () => {
    const obj = { a: 1, b: 2 };
    expect(isKeyInObject("a", obj)).toBe(true);
  });

  it("returns false for a missing string key", () => {
    const obj = { a: 1, b: 2 };
    expect(isKeyInObject("c", obj)).toBe(false);
  });

  it("returns true for numeric keys", () => {
    const obj = { 0: "zero", 1: "one" };
    expect(isKeyInObject(0, obj)).toBe(true);
  });

  it("returns false for numeric keys not in object", () => {
    const obj = { 0: "zero" };
    expect(isKeyInObject(5, obj)).toBe(false);
  });

  it("returns true for symbol keys", () => {
    const sym = Symbol("test");
    const obj = { [sym]: "value" };
    expect(isKeyInObject(sym, obj)).toBe(true);
  });

  it("returns true for inherited properties", () => {
    const parent = { inherited: true };
    const child = Object.create(parent);
    child.own = true;
    expect(isKeyInObject("inherited", child)).toBe(true);
    expect(isKeyInObject("own", child)).toBe(true);
  });

  it("returns false for empty object", () => {
    expect(isKeyInObject("any", {})).toBe(false);
  });
});
