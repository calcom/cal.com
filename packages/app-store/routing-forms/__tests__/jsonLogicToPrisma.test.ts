import { describe, expect, it, afterEach, vi } from "vitest";

import { jsonLogicToPrisma } from "../jsonLogicToPrisma";

afterEach(() => {
  vi.resetAllMocks();
});

describe("jsonLogicToPrisma(Reporting)", () => {
  describe("Text Operand", () => {
    it("should support 'Equals' operator", () => {
      const prismaWhere = jsonLogicToPrisma({
        logic: { and: [{ "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "A"] }] },
      });
      expect(prismaWhere).toEqual({
        AND: [
          {
            response: {
              path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
              equals: "A",
            },
          },
        ],
      });
    });

    it("should support 'Not Equals' operator", () => {
      const prismaWhere = jsonLogicToPrisma({
        logic: { and: [{ "!=": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "abc"] }] },
      });
      expect(prismaWhere).toEqual({
        AND: [
          {
            NOT: {
              response: {
                path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
                equals: "abc",
              },
            },
          },
        ],
      });
    });

    it("should support 'Contains' operator", () => {
      const prismaWhere = jsonLogicToPrisma({
        logic: { and: [{ in: ["A", { var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }] }] },
      });
      expect(prismaWhere).toEqual({
        AND: [
          {
            response: {
              path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
              string_contains: "A",
            },
          },
        ],
      });
    });

    it("should support 'Not Contains' operator", () => {
      const prismaWhere = jsonLogicToPrisma({
        logic: { and: [{ "!": { in: ["a", { var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }] } }] },
      });
      expect(prismaWhere).toEqual({
        AND: [
          {
            NOT: {
              response: {
                path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
                string_contains: "a",
              },
            },
          },
        ],
      });
    });

    describe("Number Type", () => {
      it("should support 'greater than' operator", () => {
        let prismaWhere = jsonLogicToPrisma({
          logic: {
            and: [
              {
                ">": [
                  {
                    var: "a0d113a8-8e40-49b7-87b1-7f4ab57d226f",
                  },
                  // Giving a string here to test that it is converted to a number
                  "100",
                ],
              },
            ],
          },
        });

        expect(prismaWhere).toEqual({
          AND: [{ response: { path: ["a0d113a8-8e40-49b7-87b1-7f4ab57d226f", "value"], gt: 100 } }],
        });

        prismaWhere = jsonLogicToPrisma({
          logic: {
            and: [
              {
                ">": [
                  {
                    var: "a0d113a8-8e40-49b7-87b1-7f4ab57d226f",
                  },
                  // A number would also work
                  100,
                ],
              },
            ],
          },
        });

        expect(prismaWhere).toEqual({
          AND: [{ response: { path: ["a0d113a8-8e40-49b7-87b1-7f4ab57d226f", "value"], gt: 100 } }],
        });
      });
      it("should support 'greater than or equal to' operator", () => {
        const prismaWhere = jsonLogicToPrisma({
          logic: {
            and: [
              {
                ">=": [
                  {
                    var: "a0d113a8-8e40-49b7-87b1-7f4ab57d226f",
                  },
                  // Giving a string here to test that it is converted to a number
                  "100",
                ],
              },
            ],
          },
        });

        expect(prismaWhere).toEqual({
          AND: [{ response: { path: ["a0d113a8-8e40-49b7-87b1-7f4ab57d226f", "value"], gte: 100 } }],
        });
      });
      it("should support 'less than' operator", () => {
        const prismaWhere = jsonLogicToPrisma({
          logic: {
            and: [
              {
                "<": [
                  {
                    var: "a0d113a8-8e40-49b7-87b1-7f4ab57d226f",
                  },
                  // Giving a string here to test that it is converted to a number
                  "100",
                ],
              },
            ],
          },
        });

        expect(prismaWhere).toEqual({
          AND: [{ response: { path: ["a0d113a8-8e40-49b7-87b1-7f4ab57d226f", "value"], lt: 100 } }],
        });
      });
      it("should support 'less than or equal to' operator", () => {
        const prismaWhere = jsonLogicToPrisma({
          logic: {
            and: [
              {
                "<=": [
                  {
                    var: "a0d113a8-8e40-49b7-87b1-7f4ab57d226f",
                  },
                  // Giving a string here to test that it is converted to a number
                  "100",
                ],
              },
            ],
          },
        });

        expect(prismaWhere).toEqual({
          AND: [{ response: { path: ["a0d113a8-8e40-49b7-87b1-7f4ab57d226f", "value"], lte: 100 } }],
        });
      });
      it("'Equals' operator should query with string as well as number", () => {
        const prismaWhere = jsonLogicToPrisma({
          logic: { and: [{ "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "1"] }] },
        });

        expect(prismaWhere).toEqual({
          AND: [
            {
              OR: [
                {
                  response: {
                    path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
                    equals: "1",
                  },
                },
                {
                  response: {
                    path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
                    equals: 1,
                  },
                },
              ],
            },
          ],
        });
      });
    });
  });

  describe("MultiSelect", () => {
    it("should support 'Equals' operator", () => {
      const prismaWhere = jsonLogicToPrisma({
        logic: {
          and: [
            { all: [{ var: "267c7817-81a5-4bef-9d5b-d0faa4cd0d71" }, { in: [{ var: "" }, ["C", "D"]] }] },
          ],
        },
      });
      expect(prismaWhere).toEqual({
        AND: [
          {
            response: { path: ["267c7817-81a5-4bef-9d5b-d0faa4cd0d71", "value"], array_contains: ["C", "D"] },
          },
        ],
      });
    });
  });

  it("should support where All Match ['Equals', 'Equals'] operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        and: [
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "a"] },
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "b"] },
        ],
      },
    });

    expect(prismaWhere).toEqual({
      AND: [
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "a",
          },
        },
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "b",
          },
        },
      ],
    });
  });

  it("should support where Any Match ['Equals', 'Equals'] operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        or: [
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "a"] },
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "b"] },
        ],
      },
    });

    expect(prismaWhere).toEqual({
      OR: [
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "a",
          },
        },
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "b",
          },
        },
      ],
    });
  });

  it("should support where None Match ['Equals', 'Equals'] operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        "!": {
          or: [
            { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "abc"] },
            { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "abcd"] },
          ],
        },
      },
    });

    expect(prismaWhere).toEqual({
      NOT: {
        OR: [
          { response: { path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"], equals: "abc" } },
          { response: { path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"], equals: "abcd" } },
        ],
      },
    });
  });
});
