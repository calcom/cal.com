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

  describe("all-in -> used by multiselect_equals", () => {
    it("should return true if all elements of the array in 'data' is in the jsonLogic 'in' array using case insensitivity", () => {
      expect(
        jsonLogic.apply(
          {
            and: [
              {
                all: [{ var: "location" }, { in: [{ var: "" }, ["nevada", "abc"]] }],
              },
            ],
          },
          // Data
          {
            there: "no",
            location: ["nevada"],
          }
        )
      ).toBe(true);
    });

    it("should return false if even one element of the array in 'data' is not in the jsonLogic 'in' array using case insensitivity", () => {
      expect(
        jsonLogic.apply(
          {
            and: [
              {
                all: [{ var: "location" }, { in: [{ var: "" }, ["India", "Canada"]] }],
              },
            ],
          },
          // Data
          {
            there: "no",
            location: ["India", "Australia"],
          }
        )
      ).toBe(false);
    });

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
          // Data
          {
            there: "no",
            location: "nevada",
          }
        )
      ).toBe(false);
    });
  });

  describe("some-in -> used by multiselect_some_in", () => {
    it("should return true if the only element of the array in 'data' is in the jsonLogic 'in' array using case insensitivity", () => {
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
                  ["India", "USA"],
                ],
              },
            ],
          },
          // data
          {
            there: "no",
            location: ["india"],
          }
        )
      ).toBe(true);
    });

    it("should return true if at least one element of the array in 'data' is in the jsonLogic 'in' array using case insensitivity", () => {
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
                  ["India", "USA"],
                ],
              },
            ],
          },
          // Data
          {
            there: "no",
            location: ["india", "Australia"],
          }
        )
      ).toBe(true);
    });

    it("should return false if none of the elements of the array in 'data' is in the jsonLogic 'in' array using case insensitivity", () => {
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
                  ["India", "Canada"],
                ],
              },
            ],
          },
          // Data
          {
            there: "no",
            location: ["Australia", "Iceland"],
          }
        )
      ).toBe(false);
    });
  });

  describe("not-in operation -> Used by select_not_any_in", () => {
    it("should return true if the string is not in the array using case insensitivity", () => {
      expect(
        jsonLogic.apply(
          {
            "!": {
              in: [
                {
                  var: "8e2233c9-d108-4473-918f-ae16345af817",
                },
                ["immigration"],
              ],
            },
          },
          // Data
          {
            "8e2233c9-d108-4473-918f-ae16345af817": "immigration",
          }
        )
      ).toBe(false);
    });
  });
});
