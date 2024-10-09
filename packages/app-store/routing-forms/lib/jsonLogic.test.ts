import { describe, it, expect } from "vitest";

import jsonLogic from "./jsonLogic";

describe("jsonLogic", () => {
  describe("== operation", () => {
    it("should compare strings case-insensitively", () => {
      expect(jsonLogic.apply({ "==": ["hello", "HELLO"] })).toBe(true);
      expect(jsonLogic.apply({ "==": ["hello", "world"] })).toBe(false);
    });

    it.skip("should compare arrays case-insensitively", () => {
      expect(
        jsonLogic.apply({
          "==": [
            ["hello", "WORLD"],
            ["HELLO", "world"],
          ],
        })
      ).toBe(true);
      expect(
        jsonLogic.apply({
          "==": [
            ["hello", "WORLD"],
            ["hi", "earth"],
          ],
        })
      ).toBe(false);
    });
  });

  describe("=== operation", () => {
    it("should compare strings case-insensitively", () => {
      expect(jsonLogic.apply({ "===": ["hello", "HELLO"] })).toBe(true);
      expect(jsonLogic.apply({ "===": ["hello", "world"] })).toBe(false);
    });
  });

  describe("!== operation", () => {
    it("should compare strings case-insensitively", () => {
      expect(jsonLogic.apply({ "!==": ["hello", "HELLO"] })).toBe(false);
      expect(jsonLogic.apply({ "!==": ["hello", "world"] })).toBe(true);
    });
  });

  describe("!= operation", () => {
    it("should compare strings case-insensitively", () => {
      expect(jsonLogic.apply({ "!=": ["hello", "HELLO"] })).toBe(false);
      expect(jsonLogic.apply({ "!=": ["hello", "world"] })).toBe(true);
    });
  });

  describe("in operation", () => {
    it("should check if a string is in another string case-insensitively", () => {
      expect(jsonLogic.apply({ in: ["lo", "HELLO"] })).toBe(true);
      expect(jsonLogic.apply({ in: ["hi", "HELLO"] })).toBe(false);
    });

    it("should check if a string is in an array case-insensitively", () => {
      expect(jsonLogic.apply({ in: ["hello", ["HELLO", "WORLD"]] })).toBe(true);
      expect(jsonLogic.apply({ in: ["hi", ["HELLO", "WORLD"]] })).toBe(false);
    });

    it("should return false if the second argument is falsy", () => {
      expect(jsonLogic.apply({ in: ["hello", false] })).toBe(false);
      expect(jsonLogic.apply({ in: ["hello", ""] })).toBe(false);
    });
  });

  describe("all-in", () => {
    it("should return true if the variable value is an array and contains the string", () => {
      expect(
        jsonLogic.apply(
          {
            and: [
              {
                all: [{ var: "location" }, { in: [{ var: "" }, ["nevada", "abc"]] }],
              },
            ],
          },
          {
            there: "no",
            location: ["nevada"],
          }
        )
      ).toBe(true);
    });
  });

  describe("some-in", () => {
    it("should return true if the variable value is an array and contains the string", () => {
      expect(
        jsonLogic.apply(
          {
            some: [
              { var: "location" },
              {
                in: [
                  {
                    var: "",
                  },
                  ["nevada", "ABC"],
                ],
              },
            ],
          },
          {
            there: "no",
            location: ["nevada"],
          }
        )
      ).toBe(true);
    });
  });
});
