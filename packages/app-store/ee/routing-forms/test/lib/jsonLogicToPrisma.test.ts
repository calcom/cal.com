import { expect, it, describe } from "@jest/globals";

import { jsonLogicToPrisma } from "../../jsonLogicToPrisma";

afterEach(() => {
  jest.resetAllMocks();
});

describe("jsonLogicToPrisma - Single Query", () => {
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
});
