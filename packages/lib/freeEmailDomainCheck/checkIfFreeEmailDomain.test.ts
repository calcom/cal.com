import { describe, expect, test } from "vitest";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", () => {
    expect(checkIfFreeEmailDomain("test@gmail.com")).toBe(true);
  });
  test("If outlook should return true", () => {
    expect(checkIfFreeEmailDomain("test@outlook.com")).toBe(true);
  });
  test("If work email, should return false", () => {
    expect(checkIfFreeEmailDomain("test@cal.com")).toBe(false);
  });
  test("If free email domain, should return true", () => {
    expect(checkIfFreeEmailDomain("test@mail2lucky.com")).toBe(true);
  });
  test("If free email domain with number, should return true", () => {
    expect(checkIfFreeEmailDomain("test@150mail.com")).toBe(true);
  });
});
